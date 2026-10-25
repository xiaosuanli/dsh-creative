// The server owns parameter schemas and scopes. This catalog bounds the public adapter.
export const operations = new Set([
  'project_get', 'node_create', 'node_update', 'resource_create', 'resource_update',
  'resource_import', 'resource_bind', 'image_generate', 'image_status', 'image_inspect',
  'image_bind', 'video_generate', 'task_get', 'task_cancel', 'task_retry', 'context_select',
  'chapter_prepare', 'video_transition', 'result_select', 'import_estimate', 'text_import',
  'novel_import', 'episode_inspect', 'episode_import', 'import_get', 'import_cancel',
  'import_resume', 'import_select_chapters', 'director_start', 'director_retry',
  'director_resume', 'director_get', 'director_cancel', 'generation_start', 'export_start',
  'export_get', 'image_models',
]);
