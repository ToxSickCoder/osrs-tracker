import { Component, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonRefresher, LoadingController } from '@ionic/angular';
import { finalize } from 'rxjs/operators';
import { AppRoute } from 'src/app/app-routing.routes';
import { AlertManager } from 'src/app/services/alert-manager/alert.manager';
import { Hiscore, Minigame, PlayerStatus, Skill } from 'src/app/services/hiscores/hiscore.model';
import { HiscoresService } from 'src/app/services/hiscores/hiscores.service';
import { StorageKey } from 'src/app/services/storage/storage-key';
import { StorageService } from 'src/app/services/storage/storage.service';

@Component({
  selector: 'page-player-hiscore',
  templateUrl: 'player-hiscore.page.html',
  styleUrls: ['./player-hiscore.page.scss'],
})
export class PlayerHiscorePage {
  readonly AppRoute = AppRoute;

  @ViewChild(IonRefresher, { static: true }) refresher: IonRefresher;

  hiscore: Hiscore;
  hiscoreSuffix = 'normal';
  oldHiscoreSuffix = 'normal';

  isFavorite = false;

  constructor(
    private loadCtrl: LoadingController,
    private alertManager: AlertManager,
    private hiscoreService: HiscoresService,
    private storageService: StorageService,
    private activatedRoute: ActivatedRoute
  ) {
    this.hiscore = this.activatedRoute.snapshot.data.playerHiscore;
    this.hiscoreSuffix = this.oldHiscoreSuffix = this.getHiscoreSuffix();

    this.addPlayerToRecents();

    this.storageService
      .getValue<string[]>(StorageKey.FavoriteHiscores, [])
      .then(favorites => (this.isFavorite = favorites.includes(this.hiscore.player.username)));
  }

  async favorite(): Promise<void> {
    this.isFavorite = await this.storageService.uniqueCacheToggle(
      StorageKey.FavoriteHiscores,
      this.hiscore.player.username
    );
    this.addPlayerToRecents();
  }

  getTypeImageUrl(): string {
    return `./assets/imgs/player_types/${this.hiscore.player.deIroned ? 'de_' : ''}${
      this.hiscore.player.playerType
    }.png`;
  }

  refreshHiscore(): void {
    this.hiscoreService
      .getHiscore(this.hiscore.player.username, this.oldHiscoreSuffix)
      .pipe(finalize(() => this.refresher.complete()))
      .subscribe(hiscore => (this.hiscore = hiscore));
  }

  async changeHiscore(): Promise<void> {
    if (this.oldHiscoreSuffix === this.hiscoreSuffix) {
      return;
    }

    const loader = await this.loadCtrl.create({ message: 'Please wait...' });
    await loader.present();

    this.hiscoreService
      .getHiscore(this.hiscore.player.username, this.hiscoreSuffix)
      .pipe(finalize(() => loader.dismiss()))
      .subscribe({
        next: hiscores => {
          this.hiscore = hiscores;
          this.oldHiscoreSuffix = this.hiscoreSuffix;
        },
        error: () => {
          this.hiscoreSuffix = this.oldHiscoreSuffix;
          this.alertManager.create({
            header: 'Player not found',
            buttons: ['OK'],
          });
        },
      });
  }

  trackBySkillName(index: number, skill: Skill): string {
    return skill.name;
  }

  trackByMinigameName(index: number, minigame: Minigame): string {
    return minigame.name;
  }

  private getHiscoreSuffix(): string {
    if (this.hiscore.player.playerType === 'normal' || this.hiscore.player.deIroned === PlayerStatus.DeIroned) {
      return 'normal';
    }
    return this.hiscore.player.dead || this.hiscore.player.deIroned === PlayerStatus.DeUltimated
      ? 'ironman'
      : this.hiscore.player.playerType;
  }

  private async addPlayerToRecents(): Promise<void> {
    const favoritedPlayers = await this.storageService.getValue(StorageKey.FavoriteHiscores, []);

    await this.storageService.limitedArrayPush(StorageKey.RecentHiscores, this.hiscore.player.username, {
      maxLength: 5,
      blacklist: favoritedPlayers,
    });
  }
}
