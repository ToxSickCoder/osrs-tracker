import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { StorageKey } from 'services/storage/storage-key';
import { StorageService } from 'services/storage/storage.service';

@Injectable({
  providedIn: 'root',
})
export class HiscoresResolver implements Resolve<{ favorites: string[]; recents: string[] }> {
  constructor(private storageService: StorageService) {}

  async resolve(): Promise<{ favorites: string[]; recents: string[] }> {
    return {
      favorites: await this.storageService.getValue<string[]>(StorageKey.FavoriteHiscores, []),
      recents: await this.storageService.getValue<string[]>(StorageKey.RecentHiscores, []),
    };
  }
}