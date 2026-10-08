import {
  mkdir,
  lstat,
  realpath,
  open,
  rename,
  unlink,
  readFile,
  readdir,
} from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { ApiError } from './errors.js';
/** Root must be private to the service account. Client values never become paths. */
export class AudioStorage {
  private root: string;
  constructor(root: string) {
    this.root = resolve(root);
  }
  async init() {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    if ((await lstat(this.root)).isSymbolicLink())
      throw new Error('Audio root cannot be a symlink.');
    this.root = await realpath(this.root);
  }
  private path(key: string) {
    if (!/^[a-f0-9-]{36}$/.test(key))
      throw new ApiError(400, 'INVALID_KEY', 'Некорректный ключ.');
    return join(this.root, key);
  }
  private async safe(key: string) {
    const path = this.path(key);
    const stat = await lstat(path);
    if (!stat.isFile() || stat.isSymbolicLink())
      throw new ApiError(404, 'AUDIO_UNAVAILABLE', 'Аудио недоступно.');
    return path;
  }
  async write(bytes: Buffer) {
    const key = randomUUID(),
      temp = randomUUID();
    const tempPath = this.path(temp);
    const file = await open(
      tempPath,
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
      0o600,
    );
    try {
      await file.writeFile(bytes);
      await file.sync();
      await file.close();
      await rename(tempPath, this.path(key));
      return key;
    } catch (error) {
      await file.close().catch(() => {});
      await unlink(tempPath).catch(() => {});
      throw error;
    }
  }
  async read(key: string) {
    return readFile(await this.safe(key));
  }
  async stream(key: string, start?: number, end?: number) {
    const file = await open(
      await this.safe(key),
      constants.O_RDONLY | (constants.O_NOFOLLOW || 0),
    );
    return file.createReadStream({ start, end, autoClose: true });
  }
  async remove(key: string) {
    try {
      await unlink(await this.safe(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  async sweep(known: Set<string>, now = new Date()) {
    for (const key of await readdir(this.root)) {
      if (!/^[a-f0-9-]{36}$/.test(key) || known.has(key)) continue;
      const stat = await lstat(this.path(key));
      if (
        stat.isFile() &&
        !stat.isSymbolicLink() &&
        stat.mtimeMs < now.getTime() - 86400000
      )
        await this.remove(key);
    }
  }
}
