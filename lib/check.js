import fs from 'node:fs/promises';
import { writeFile } from './write.js';

export const checkDB = async filePath => {
  try {
    await fs.access(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      const emptyArray = [];
      await writeFile(filePath, emptyArray);
      return emptyArray;
    }
    throw error;
  }
};
