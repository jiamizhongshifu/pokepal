import type { SaveData } from '../types';
import { readSaveSnapshot, resetSave, writeSave } from './db';
import { newSave, prepareForPlay } from './saveLifecycle';
import { validateSave } from './saveValidation';

/** One writer window owns this queue and its last successfully written database revision. */
export class SavePersistence {
  private revision = 0;
  private pending?: SaveData;
  private writing?: Promise<void>;
  private timer?: ReturnType<typeof setTimeout>;

  constructor(private onWriteFailure: (error: unknown) => void) {}

  schedule(save: SaveData) {
    this.pending = save;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { void this.flush().catch(() => {}); }, 400);
  }

  async flush(save?: SaveData) {
    clearTimeout(this.timer);
    if (save) this.pending = save;
    while (this.writing || this.pending) {
      if (!this.writing && this.pending) {
        const snapshot = this.pending;
        this.pending = undefined;
        this.writing = writeSave(snapshot, this.revision)
          .then(revision => { this.revision = revision; })
          .catch(error => {
            this.pending ??= snapshot;
            this.onWriteFailure(error);
            throw error;
          })
          .finally(() => { this.writing = undefined; });
      }
      await this.writing;
    }
  }

  async readForPlay(reloadFromDisk: boolean) {
    clearTimeout(this.timer);
    // After a conflict the family explicitly reloads the other window's newer revision.
    if (reloadFromDisk) await this.writing;
    else await this.flush();
    const snapshot = await readSaveSnapshot();
    const save = snapshot.save === undefined ? newSave() : validateSave(snapshot.save);
    if (save.trainer && !save.trainer.avatar.startsWith('avatar-')) save.trainer.avatar = 'avatar-red';
    prepareForPlay(save);
    this.revision = snapshot.revision;
    this.pending = undefined;
    return save;
  }

  async replace(save: SaveData, operation: 'import' | 'reset') {
    await this.flush();
    this.revision = operation === 'import'
      ? await writeSave(save, this.revision, true)
      : await resetSave(save, this.revision);
  }
}
