<?php
require_once 'database.php';

echo "Creating SQLite database...\n";

try {
    $database = Database::getInstance();
    echo "Database initialized successfully!\n";
    echo "Database file created at: " . DB_PATH . "\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>