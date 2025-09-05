<?php
// Configuration settings
define('DB_PATH', 'todos.db');
define('MAX_TEXT_LENGTH', 500);
define('RATE_LIMIT_REQUESTS', 100);
define('RATE_LIMIT_TIME', 3600); // 1 hour
define('ENABLE_CORS', true);
define('ALLOWED_ORIGINS', ['http://localhost', 'http://127.0.0.1']);
define('LOG_ERRORS', true);
define('DEBUG_MODE', false);

// Valid categories and priorities
define('VALID_CATEGORIES', ['genel', 'is', 'kisisel', 'acil', 'alısveris', 'saglik', 'egitim']);
define('VALID_PRIORITIES', ['yuksek', 'orta', 'dusuk']);

// Security settings
define('MAX_TODOS_PER_REQUEST', 1000);
define('ENABLE_REQUEST_LOGGING', true);
?>