<?php
// Test script to verify API functionality
$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['REMOTE_ADDR'] = '127.0.0.1';
$_SERVER['HTTP_USER_AGENT'] = 'Test Script';

ob_start();
try {
    require_once 'api.php';
    $output = ob_get_clean();
    echo "API Response: " . $output . "\n";
    echo "Test PASSED\n";
} catch (Exception $e) {
    ob_end_clean();
    echo "Test FAILED: " . $e->getMessage() . "\n";
}
?>