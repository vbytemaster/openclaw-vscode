# review-policy.json format

Location: workspace root (`review-policy.json`).

```json
{
  "description": "Human-readable description",
  "reviewRequired": [
    {
      "path": "project-folder",
      "name": "Project Name",
      "note": "Why review is needed"
    }
  ],
  "directEditAllowed": [
    {
      "path": "utils-folder",
      "name": "Utils",
      "note": "Safe to edit directly"
    }
  ]
}
```

## Fields

- `reviewRequired[].path` — folder path relative to workspace root. Any file under this path requires review.
- `directEditAllowed[].path` — folder path where direct edits are allowed.
- Files not matching any path → direct edit allowed (default open).

## Matching logic

Check if the target file path starts with any `reviewRequired[].path`. If yes → propose via JSON. If it matches `directEditAllowed[].path` or no match → edit directly.
