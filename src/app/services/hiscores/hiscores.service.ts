import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { forkJoin, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { NativeHttp } from 'src/app/core/native-http/nativeHttp';
import { environment } from 'src/environments/environment';
import { XpService } from '../xp/xp.service';
import { HiscoreUtilitiesService } from './hiscore-utilities.service';
import { Hiscore, Player, PlayerStatus, PlayerType } from './hiscore.model';

const CACHE_TIME_TYPES = 6; // hours

@Injectable({
  providedIn: 'root',
})
export class HiscoresService {
  constructor(
    private httpClient: HttpClient,
    private nativeHttp: NativeHttp,
    private hiscoreUtilitiesService: HiscoreUtilitiesService,
    private xpService: XpService
  ) {}

  getCompareHiscores(username: string, compare: string): Observable<Hiscore[]> {
    return forkJoin([
      this.getHiscore(username).pipe(catchError(err => of(err))),
      this.getHiscore(compare).pipe(catchError(err => of(err))),
    ]).pipe(
      switchMap(([forUsername, forCompare]) => {
        if (forUsername.status !== 404 && forCompare.status !== 404) {
          return of([forUsername, forCompare]);
        } else {
          return throwError((forUsername.status === 404 ? 1 : 0) + (forCompare.status === 404 ? 2 : 0));
        }
      })
    );
  }

  getHiscore(username: string, type: string = ''): Observable<Hiscore> {
    type = type === 'normal' ? '' : type;
    return this.nativeHttp
      .getText(
        `${environment.API_RUNESCAPE}/m=hiscore_oldschool${type ? `_${type}` : ''}/index_lite.ws?player=${username}`
      )
      .pipe(
        map(response => ({
          ...this.hiscoreUtilitiesService.parseHiscoreString(response, new Date()),
          player: new Player(username),
          type: type ? type : 'normal',
        }))
      );
  }

  getHiscoreAndType(username: string): Observable<Hiscore> {
    return this.httpClient.get(`${environment.API_GEPT}/player/${username}`, { observe: 'response' }).pipe(
      catchError(err => of(err)),
      switchMap(response => {
        if (response.status === 200) {
          const player = response.body as Player;
          const hoursSinceCheck = (Date.now() - new Date(player.lastChecked!).getTime()) / 36e5;

          // When a player is a normal player, don't try to redetermine it's type.
          if (player.playerType === 'normal') {
            const requests$: Observable<any>[] = [this.getHiscore(player.username)];
            if (hoursSinceCheck > CACHE_TIME_TYPES) {
              // Update lastChecked only when CACHE_TIME_TYPES expired
              requests$.push(this.insertOrUpdatePlayer(player));
            }
            return forkJoin(requests$).pipe(
              map(([hiscore]) => ({ ...hiscore, player })),
              catchError(err => throwError(err))
            );
          }

          // Return cached ironman status.
          if (hoursSinceCheck < CACHE_TIME_TYPES) {
            return this.getHiscore(
              username,
              player.deIroned === PlayerStatus.DeIroned
                ? 'normal'
                : player.dead || player.deIroned === PlayerStatus.DeUltimated
                ? 'ironman'
                : player.playerType
            ).pipe(
              map((hiscore: Hiscore) => ({ ...hiscore, player })),
              catchError(err => throwError(err))
            );
          }
        }
        // Determine ironman status after CACHE_TIME_TYPES have expired (dead hardcore? deironed?)
        return this.determineHiscoreAndType(username);
      })
    );
  }

  private determineHiscoreAndType(username: string): Observable<Hiscore> {
    return forkJoin([
      this.getHiscore(username).pipe(catchError(err => of(err))),
      this.getHiscore(username, PlayerType.Ironman).pipe(catchError(err => of(err))),
      this.getHiscore(username, PlayerType.Ultimate).pipe(catchError(err => of(err))),
      this.getHiscore(username, PlayerType.Hardcore).pipe(catchError(err => of(err))),
    ]).pipe(
      switchMap(response => {
        const [normal, ironman, ultimate, hardcore] = response;
        if (normal.status === 404) {
          return throwError(normal);
        } else if (ultimate.status !== 404 && hardcore.status === 404) {
          const deIroned =
            +ironman.skills[0].exp < +normal.skills[0].exp
              ? PlayerStatus.DeIroned
              : +ultimate.skills[0].exp < +ironman.skills[0].exp
              ? PlayerStatus.DeUltimated
              : PlayerStatus.Default;

          const player = new Player(username.trim(), PlayerType.Ultimate, deIroned);
          let hiscore: Hiscore;

          switch (deIroned) {
            case PlayerStatus.DeUltimated:
              hiscore = ironman;
              break;
            case PlayerStatus.DeIroned:
              hiscore = normal;
              break;
            case PlayerStatus.Default:
            default:
              hiscore = ultimate;
              break;
          }

          return forkJoin([of({ ...hiscore, player }), this.insertOrUpdatePlayer(player)]);
        } else if (hardcore.status !== 404 && ultimate.status === 404) {
          const deIroned = +ironman.skills[0].exp < +normal.skills[0].exp;
          const dead = +ironman.skills[0].exp > +hardcore.skills[0].exp;

          const player = new Player(username.trim(), PlayerType.Hardcore, Number(deIroned), dead);
          return forkJoin([
            of({ ...(deIroned ? normal : dead ? ironman : hardcore), player }),
            this.insertOrUpdatePlayer(player),
          ]);
        } else if (ironman.status !== 404) {
          const deIroned = +ironman.skills[0].exp < +normal.skills[0].exp;

          const player = new Player(username.trim(), PlayerType.Ironman, Number(deIroned));
          return forkJoin([of({ ...(deIroned ? normal : ironman), player }), this.insertOrUpdatePlayer(player)]);
        } else {
          const player = new Player(username.trim(), PlayerType.Normal);
          return forkJoin([of({ ...normal, player }), this.insertOrUpdatePlayer(player)]);
        }
      }),
      switchMap(([hiscore, statusCode]: [Hiscore, number]) =>
        statusCode === 201 ? this.xpService.insertInitialXpDatapoint(username, hiscore) : of(hiscore)
      )
    );
  }

  private insertOrUpdatePlayer(player: Player): Observable<number> {
    return this.httpClient
      .post(`${environment.API_GEPT}/player`, player, { observe: 'response' })
      .pipe(map(res => res.status));
  }
}
