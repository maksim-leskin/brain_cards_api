# API Brain Cards



Доступные методы:
GET  /api/category         - получить список категорий
GET  /api/category/{id}    - получить список пар по категории
DELETE  /api/category/{id} - удалить категорию
POST /api/category         - добавить категорию
        {
          title: {},
          pairs[]?:[[string, string]]
        }

PATCH /api/category/{id}   - обновить категорию
        {
          title: {},
          pairs[]?:[[string, string]]
        }

