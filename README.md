# API Brain Cards


Доступные методы:
GET  /api/category      - получить список категорий
GET  /api/category/{id} - получить список пар по категории
POST /api/category      - добавить категорию
        {
          title: {},
          pairs[]?:[[string, string]]
        }
