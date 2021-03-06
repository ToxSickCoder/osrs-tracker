import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SharedModule } from 'src/app/shared/shared.module';
import { HiscoresComparePage } from './compare-hiscores/compare-hiscores.page';
import { CompareHiscoresResolver } from './compare-hiscores/compare-hiscores.resolver';
import { HiscoreFavoriteComponent } from './components/hiscore-favorite/hiscore-favorite.component';
import { SearchHiscoreComponent } from './components/search-hiscore/search-hiscore.component';
import { HiscoresPage } from './hiscores.page';
import { HiscoresResolver } from './hiscores.resolver';
import { HiscoresRoute } from './hiscores.routes';
import { PlayerHiscorePage } from './player-hiscore/player-hiscore.page';
import { PlayerHiscoreResolver } from './player-hiscore/player-hiscore.resolver';

@NgModule({
  imports: [
    SharedModule,
    FormsModule,
    RouterModule.forChild([
      {
        path: '',
        component: HiscoresPage,
        resolve: {
          cachedHiscores: HiscoresResolver,
        },
      },
      {
        path: `${HiscoresRoute.PlayerHiscore}/:player`,
        component: PlayerHiscorePage,
        resolve: {
          playerHiscore: PlayerHiscoreResolver,
        },
      },
      {
        path: `${HiscoresRoute.CompareHiscores}/:player/:compare`,
        component: HiscoresComparePage,
        resolve: {
          compareHiscores: CompareHiscoresResolver,
        },
      },
    ]),
  ],
  declarations: [
    HiscoresPage,
    PlayerHiscorePage,
    HiscoresComparePage,
    HiscoreFavoriteComponent,
    SearchHiscoreComponent,
  ],
})
export class HiscoresModule {}
