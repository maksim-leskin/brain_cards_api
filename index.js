import { createServer } from 'node:http';
import path from 'node:path';
import * as url from 'node:url';
import { writeFile } from './lib/write.js';
import { readFile } from './lib/read.js';
import { checkDB } from './lib/check.js';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
export const DB_CARD_URL = path.resolve(__dirname, 'db_card.json');
const DB_USER_URL = path.resolve(__dirname, 'db_user.json');
const PORT = process.env.PORT || 3024;
const URI_PREFIX = '/api';

const drainJson = req =>
  new Promise(resolve => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
    });
    req.on('end', () => {
      resolve(JSON.parse(data));
    });
  });

class ApiError extends Error {
  constructor(statusCode, data) {
    super();
    this.statusCode = statusCode;
    this.data = data;
  }
}

const shuffle = array => {
  const shuffleArray = [...array];
  for (let i = shuffleArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffleArray[i], shuffleArray[j]] = [shuffleArray[j], shuffleArray[i]];
  }

  return shuffleArray;
};

const createCategory = async ({ title, pairs = [] }) => {
  if (!(typeof title === 'string')) {
    throw new ApiError(400, { message: 'title обязательное свойство' });
  }

  if (!Array.isArray(pairs)) {
    throw new ApiError(400, {
      message: 'pairs обязательно должен быть массив',
    });
  }

  if (pairs?.length) {
    if (!Array.isArray(pairs[0])) {
      throw new ApiError(400, {
        message: 'pairs может содержать только массив',
      });
    }
  }

  if (
    !pairs.every(
      item =>
        Array.isArray(item) &&
        typeof item[0] === 'string' &&
        typeof item[1] === 'string',
    )
  ) {
    throw new ApiError(400, {
      message: 'pairs должен содержать массивы с двумя строками',
    });
  }

  const category = { title, pairs };
  category.id = `bc${Math.random().toString(36).substring(2, 12)}`;
  const categoryList = await readFile(DB_CARD_URL);
  categoryList.push(category);
  await writeFile(DB_CARD_URL, categoryList);

  return category;
};

const getCategoryList = async () => {
  const categoryList = await readFile(DB_CARD_URL);
  return categoryList.map(({ id, title, pairs }) => ({
    id,
    title,
    length: pairs.length,
  }));
};

const getCategory = async itemId => {
  const categoryList = await readFile(DB_CARD_URL);
  const category = categoryList.find(({ id }) => id === itemId);
  if (!category) throw new ApiError(404, { message: 'Item Not Found' });
  return category;
};

const initServer = () => {
  const server = createServer(async (req, res) => {
    // req - объект с информацией о запросе,
    // res - объект для управления отправляемым ответом

    // этот заголовок ответа указывает, что тело ответа будет в JSON формате
    res.setHeader('Content-Type', 'application/json');

    // CORS заголовки ответа для поддержки кросс-доменных запросов из браузера
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // запрос с методом OPTIONS может отправлять браузер автоматически
    // для проверки CORS заголовков
    // в этом случае достаточно ответить с пустым телом и этими заголовками
    if (req.method === 'OPTIONS') {
      // end = закончить формировать ответ и отправить его клиенту
      res.end();
      return;
    }

    // если URI не начинается с нужного префикса - можем сразу отдать 404
    if (!req.url || !req.url.startsWith(URI_PREFIX)) {
      res.statusCode = 404;
      res.end(JSON.stringify({ message: 'Not Found' }));
      return;
    }

    // убираем из запроса префикс URI, разбиваем его на путь и параметры
    const [uri, query] = req.url.substring(URI_PREFIX.length).split('?');
    const queryParams = {};
    // параметры могут отсутствовать вообще или иметь вид a=b&b=c
    // во втором случае наполняем объект queryParams { a: 'b', b: 'c' }
    if (query) {
      for (const piece of query.split('&')) {
        const [key, value] = piece.split('=');
        queryParams[key] = value ? decodeURIComponent(value) : '';
      }
    }

    // запрос на обработку POST запроса
    try {
      if (req.method === 'POST' && req.url === `${URI_PREFIX}/category`) {
        const category = await createCategory(await drainJson(req));
        res.statusCode = 201;
        res.setHeader('Access-Control-Expose-Headers', 'Location');
        res.setHeader('Location', `${URI_PREFIX}/category/${category.id}`);
        res.end(JSON.stringify(category));
        return;
      }
    } catch (err) {
      console.log('err: ', err);
      // обрабатываем сгенерированную нами же ошибку
      if (err instanceof ApiError) {
        res.writeHead(err.statusCode);
        res.end(JSON.stringify(err.data));
      } else {
        // если что-то пошло не так - пишем об этом в консоль
        // и возвращаем 500 ошибку сервера
        res.statusCode = 500;
        res.end(JSON.stringify({ message: 'Server Error' }));
      }
    }

    // запрос на обработку GET запроса
    try {
      if (req.method === 'GET') {
        if (req.url === `${URI_PREFIX}/category`) {
          const categories = await getCategoryList();
          res.end(JSON.stringify(categories));
          return;
        }

        if (req.url.startsWith(`${URI_PREFIX}/category/`)) {
          const index = uri.lastIndexOf('/');
          const id = uri.substring(index + 1);
          const category = await getCategory(id);
          res.end(JSON.stringify(category));
          return;
        }
      }
    } catch (err) {
      console.log('err: ', err);
      // обрабатываем сгенерированную нами же ошибку
      if (err instanceof ApiError) {
        res.writeHead(err.statusCode);
        res.end(JSON.stringify(err.data));
      } else {
        // если что-то пошло не так - пишем об этом в консоль
        // и возвращаем 500 ошибку сервера
        res.statusCode = 500;
        res.end(JSON.stringify({ message: 'Server Error' }));
      }
    }
  });

  // выводим инструкцию, как только сервер запустился...
  server.on('listening', () => {
    if (process.env.NODE_ENV !== 'test') {
      console.log(
        `Сервер Brain Cards запущен. Вы можете использовать его по адресу http://localhost:${PORT}`,
      );
      console.log('Нажмите CTRL+C, чтобы остановить сервер');
      console.log('Доступные методы:');
      console.log('GET  /api/category      - получить список категорий');
      console.log('GET  /api/category/{id} - получить список пар по категории');
      console.log(
        `POST /api/category      - добавить категорию
        {
          title: {},
          pairs[]?:[[string, string]]
        }
      `,
      );
    }
  });
  // ...и вызываем запуск сервера на указанном порту

  server.listen(PORT);
};

const initApp = async () => {
  checkDB(DB_CARD_URL);

  initServer();
};

initApp();
