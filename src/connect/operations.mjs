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
  'library_list', 'library_manage', 'canvas_edit', 'media_edit', 'video_configure',
  'media_preview', 'generation_list', 'queue_cancel', 'generation_cancel_node',
  'import_steps', 'import_budget', 'import_retry_speech',
  'canvas_history', 'canvas_restore', 'story_reparse', 'review_acknowledge',
]);
