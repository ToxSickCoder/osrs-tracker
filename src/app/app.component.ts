import { Component, OnInit, ViewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { IonMenu, NavController, Platform } from '@ionic/angular';
import { filter } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AppRoute } from './app-routing.routes';
import { Logger } from './core/logger/logger';
import { AlertManager } from './services/alert-manager/alert.manager';
import { NewsService } from './services/news/news.service';
import { SettingsService } from './services/settings/settings.service';

class Page {
  constructor(
    public id: number,
    public icon: string,
    public title: string,
    public active: boolean,
    public visible: boolean,
    public route?: string,
    public badge?: string,
    public action?: () => void
  ) { }
}

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
})
export class AppComponent implements OnInit {
  @ViewChild(IonMenu, { static: true }) menu!: IonMenu;

  constructor(
    private alertManager: AlertManager,
    private navCtrl: NavController,
    private newsProvider: NewsService,
    private platform: Platform,
    private router: Router,
    private settingsService: SettingsService
  ) { }

  pages: Page[] = [
    new Page(0, 'md-home', 'Home', false, true, AppRoute.Home),
    new Page(1, 'md-today', 'App News', false, true, AppRoute.AppNews, undefined, () => this.checkForNewAppNews()),
    new Page(2, 'md-trending-up', 'Grand Exchange', false, true, AppRoute.GrandExchange),
    new Page(3, 'md-trophy', 'Hiscores', false, true, AppRoute.Hiscores),
    new Page(4, 'md-podium', 'XP Tracker', false, true, AppRoute.XpTracker),
    new Page(5, 'md-wikipedia', 'OSRS Wiki', false, true, AppRoute.OSRSWiki),
    new Page(6, 'md-discord', 'Discord', false, true, undefined, undefined, () =>
      window.open('https://discord.gg/k7E6WZj', '_system')
    ),
    new Page(7, 'md-star', 'Rate App', false, !environment.web, undefined, undefined, () =>
      window.open('market://details?id=com.toxsickproductions.geptv2', '_system')
    ),
    new Page(9, 'md-settings', 'Settings', false, true, AppRoute.Settings),
  ];

  readonly production = environment.production;

  ngOnInit(): void {
    this.initializeApp();
  }

  linkClicked(page: Page): void {
    if (page.action) {
      page.action();
    }
    if (page.route) {
      this.navCtrl.navigateRoot(page.route, { animated: false });
    }
  }

  trackByPageId(_: number, page: Page): number {
    return page.id;
  }

  private async initializeApp(): Promise<void> {
    await this.platform.ready();
    Logger.log('IonicPlatform ready');
    await this.settingsService.init();
    Logger.log('Settings loaded');

    this.checkForNewAppNews();
    this.listenForActivePage();
    this.backButtonLogic();
    Logger.log('Finished initializing app');
  }

  private async checkForNewAppNews(): Promise<void> {
    if (await this.newsProvider.isNewAppArticleAvailable()) {
      this.pages.filter(page => page.title === 'App News')[0].badge = 'NEW';
    } else {
      this.pages.filter(page => page.title === 'App News')[0].badge = undefined;
    }
  }

  private listenForActivePage(): void {
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe({
      next: () => {
        const activePage = this.router.url.substr(1).split('/')[0];
        this.pages = this.pages.map(page => ({
          ...page,
          active: activePage === page.route,
        }));
      },
    });
  }

  private backButtonLogic(): void {
    this.platform.backButton.subscribeWithPriority(1, async () => {
      const segments = this.router.url.substr(1).split('/');
      if (this.alertManager.isDialogOpen()) {
        this.alertManager.close();
      } else if (await this.menu.isOpen()) {
        this.menu.close();
      } else if (segments.includes(AppRoute.XpTracker) && segments.length > 1) {
        this.navCtrl.navigateBack(AppRoute.XpTracker);
      } else if (segments.length > 1) {
        this.navCtrl.back({ animated: true });
      } else if (!this.router.isActive(AppRoute.Home, false)) {
        this.navCtrl.navigateRoot(AppRoute.Home, { animated: true, animationDirection: 'back' });
      } else {
        (navigator as any)['app'].exitApp();
      }
    });
  }
}
