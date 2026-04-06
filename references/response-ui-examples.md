# Response UI examples for OpenClaw VS Code chat

Use these examples when replying in the VS Code chat and the renderer can benefit from structured UI.

## Rules of thumb
- Always write the normal human-readable answer first.
- Append an `openclaw-ui` fenced block only when it improves the UI.
- Keep the JSON compact and valid.
- Prefer `actions` for suggested next steps.
- Prefer `checks` for verification steps.
- Prefer `files` for changed/generated file lists.
- Prefer `table` for side-by-side comparisons.
- Prefer `status` instead of emoji-only status lines.

## Example 1 — done + next step buttons

````md
Готово. Я починил startup context и собрал новый VSIX.

Переустанови расширение и проверь первый запрос в новом чате.

```openclaw-ui
{
  "status": {
    "tone": "success",
    "title": "Релиз готов",
    "text": "Сборка завершилась успешно, VSIX готов к установке"
  },
  "checks": [
    "Установить новый VSIX",
    "Reload Window",
    "Открыть новый чат",
    "Отправить первое сообщение"
  ],
  "actions": [
    {
      "label": "Дай шаги проверки",
      "prompt": "Напиши короткие шаги проверки после установки VSIX.",
      "mode": "send",
      "kind": "primary"
    },
    {
      "label": "Что изменилось",
      "prompt": "Коротко перечисли изменения в этом релизе.",
      "mode": "send",
      "kind": "secondary"
    }
  ]
}
```
````

## Example 2 — file list + checks

````md
Сделал foundation для нового UI чата.

```openclaw-ui
{
  "summary": "Добавлен renderer для structured assistant responses и action buttons.",
  "files": [
    { "path": "src/webview/render.ts", "note": "parser + renderer structured blocks" },
    { "path": "src/webview/chat.ts", "note": "handlers для action buttons" },
    { "path": "src/chat/html.ts", "note": "новые стили карточек, таблиц и callout'ов" }
  ],
  "checks": [
    "Открыть чат и проверить обычный markdown",
    "Проверить таблицу в ответе",
    "Проверить кнопку suggested action"
  ]
}
```
````

## Example 3 — comparison table

````md
Вот сравнение вариантов.

```openclaw-ui
{
  "table": {
    "title": "Варианты внедрения",
    "columns": ["Вариант", "Плюсы", "Минусы"],
    "rows": [
      ["Prompt-only", "Быстро", "Хрупко и нестабильно"],
      ["Renderer-first", "Чистая архитектура", "Нужно внедрять типы и parser"],
      ["Full rewrite", "Максимальная гибкость", "Дольше по времени"]
    ]
  },
  "actions": [
    {
      "label": "Выбрать renderer-first",
      "prompt": "Идём по стратегии renderer-first. Составь план внедрения.",
      "mode": "send",
      "kind": "primary"
    }
  ]
}
```
````

## Example 4 — choice list

````md
Можно пойти несколькими путями.

```openclaw-ui
{
  "choices": [
    {
      "label": "Быстрый MVP",
      "description": "Минимальный parser, actions, checks, table rendering",
      "prompt": "Сделай быстрый MVP Response UI v1 без полного рефактора.",
      "mode": "send"
    },
    {
      "label": "Качественное решение",
      "description": "Новый renderer pipeline и response contract",
      "prompt": "Сделай качественное и чистое решение для Response UI v1.",
      "mode": "send"
    }
  ]
}
```
````

## Example 5 — warning/error block

````md
Есть риск: первый model switch может падать до создания session.

```openclaw-ui
{
  "status": {
    "tone": "warning",
    "title": "Есть хрупкий участок",
    "text": "Session override на первом сообщении может падать, если session ещё не существует"
  },
  "actions": [
    {
      "label": "Исправить это",
      "prompt": "Исправь first-turn model switch так, чтобы не было ошибки при отсутствии session.",
      "mode": "send",
      "kind": "primary"
    }
  ]
}
```
````
