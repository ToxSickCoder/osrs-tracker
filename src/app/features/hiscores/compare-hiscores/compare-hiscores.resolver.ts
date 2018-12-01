import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { LoadingController } from '@ionic/angular';
import { forkJoin, throwError } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { Hiscore } from 'services/hiscores/hiscore.model';
import { HiscoresProvider } from 'services/hiscores/hiscores';

@Injectable({
  providedIn: 'root'
})
export class CompareHiscoresResolver implements Resolve<Hiscore[]> {

  constructor(
    private hiscoresProvider: HiscoresProvider,
    private loadCtrl: LoadingController
  ) { }

  async resolve(route: ActivatedRouteSnapshot): Promise<Hiscore[]> {
    const loader = await this.loadCtrl.create({ message: 'Please wait...' });
    await loader.present();

    return forkJoin(
      this.hiscoresProvider.getHiscoreAndType(route.params.player)
        .pipe(catchError(() => throwError('Player'))),
      this.hiscoresProvider.getHiscoreAndType(route.params.compare)
        .pipe(catchError(() => throwError('Compare'))),
    ).pipe(
      finalize(() => loader.dismiss()),
    ).toPromise();
  }

}