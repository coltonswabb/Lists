import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { readBackup } from './store';

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Writes the backup to a file and opens the share sheet, so it can be saved to Files, AirDropped or
 * mailed. Nothing leaves the phone unless the user sends it somewhere.
 */
export const shareBackup = async (contents: string): Promise<void> => {
  const file = new File(Paths.cache, `Decree backup ${today()}.json`);
  file.create({ overwrite: true });
  await file.write(contents);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Back up thy library' });
};

export type PickedBackup =
  | { kind: 'canceled' }
  | { kind: 'invalid' }
  | { kind: 'backup'; contents: NonNullable<ReturnType<typeof readBackup>> };

/** Lets the user choose a backup file and reads it. Nothing is changed until the caller restores it. */
export const pickBackup = async (): Promise<PickedBackup> => {
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'public.json', '*/*'], copyToCacheDirectory: true });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return { kind: 'canceled' };
  const contents = readBackup(await new File(asset.uri).text());
  return contents ? { kind: 'backup', contents } : { kind: 'invalid' };
};
