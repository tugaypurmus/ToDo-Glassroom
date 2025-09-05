<?php
require_once 'config.php';

class Security {
    private static $rateLimitData = [];
    
    // Rate limiting
    public static function checkRateLimit($identifier = null) {
        if (!$identifier) {
            $identifier = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        }
        
        $now = time();
        $timeWindow = RATE_LIMIT_TIME;
        $maxRequests = RATE_LIMIT_REQUESTS;
        
        // Clean old entries
        if (isset(self::$rateLimitData[$identifier])) {
            self::$rateLimitData[$identifier] = array_filter(
                self::$rateLimitData[$identifier], 
                fn($timestamp) => ($now - $timestamp) < $timeWindow
            );
        } else {
            self::$rateLimitData[$identifier] = [];
        }
        
        // Check rate limit
        if (count(self::$rateLimitData[$identifier]) >= $maxRequests) {
            http_response_code(429);
            throw new Exception('Rate limit exceeded. Please try again later.');
        }
        
        // Add current request
        self::$rateLimitData[$identifier][] = $now;
        return true;
    }
    
    // Input validation and sanitization
    public static function validateTodoData($data, $isUpdate = false) {
        $errors = [];
        
        // Text validation
        if (!$isUpdate || isset($data['text'])) {
            if (empty($data['text']) || !is_string($data['text'])) {
                $errors[] = 'Todo text is required and must be a string';
            } elseif (strlen(trim($data['text'])) > MAX_TEXT_LENGTH) {
                $errors[] = 'Todo text is too long (max ' . MAX_TEXT_LENGTH . ' characters)';
            } elseif (strlen(trim($data['text'])) < 1) {
                $errors[] = 'Todo text cannot be empty';
            }
        }
        
        // Category validation
        if (isset($data['category']) && !in_array($data['category'], VALID_CATEGORIES)) {
            $errors[] = 'Invalid category';
        }
        
        // Priority validation  
        if (isset($data['priority']) && !in_array($data['priority'], VALID_PRIORITIES)) {
            $errors[] = 'Invalid priority';
        }
        
        // Due date validation
        if (isset($data['due_date']) && $data['due_date'] !== null) {
            if (!self::validateDate($data['due_date'])) {
                $errors[] = 'Invalid due date format (expected Y-m-d)';
            }
        }
        
        // Order index validation
        if (isset($data['order_index']) && (!is_numeric($data['order_index']) || $data['order_index'] < 0)) {
            $errors[] = 'Order index must be a positive number';
        }
        
        // ID validation for updates
        if ($isUpdate && isset($data['id']) && (!is_numeric($data['id']) || $data['id'] <= 0)) {
            $errors[] = 'Invalid todo ID';
        }
        
        if (!empty($errors)) {
            throw new Exception('Validation failed: ' . implode(', ', $errors));
        }
        
        return self::sanitizeData($data);
    }
    
    private static function validateDate($date) {
        $d = DateTime::createFromFormat('Y-m-d', $date);
        return $d && $d->format('Y-m-d') === $date;
    }
    
    private static function sanitizeData($data) {
        $sanitized = [];
        
        if (isset($data['text'])) {
            $sanitized['text'] = trim(htmlspecialchars($data['text'], ENT_QUOTES, 'UTF-8'));
        }
        
        if (isset($data['category'])) {
            $sanitized['category'] = trim($data['category']);
        }
        
        if (isset($data['priority'])) {
            $sanitized['priority'] = trim($data['priority']);  
        }
        
        if (isset($data['due_date'])) {
            $sanitized['due_date'] = $data['due_date'];
        }
        
        if (isset($data['order_index'])) {
            $sanitized['order_index'] = (int)$data['order_index'];
        }
        
        if (isset($data['id'])) {
            $sanitized['id'] = (int)$data['id'];
        }
        
        if (isset($data['completed'])) {
            $sanitized['completed'] = (bool)$data['completed'];
        }
        
        return $sanitized;
    }
    
    // CORS handling
    public static function handleCORS() {
        if (!ENABLE_CORS) return;
        
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        
        // Check if origin is allowed
        $allowedOrigin = '*';
        if (!empty(ALLOWED_ORIGINS)) {
            $isAllowed = false;
            foreach (ALLOWED_ORIGINS as $allowed) {
                if (strpos($origin, $allowed) === 0) {
                    $isAllowed = true;
                    $allowedOrigin = $origin;
                    break;
                }
            }
            if (!$isAllowed) {
                $allowedOrigin = ALLOWED_ORIGINS[0];
            }
        }
        
        header('Access-Control-Allow-Origin: ' . $allowedOrigin);
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        header('Access-Control-Max-Age: 86400');
        
        // Handle preflight
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit();
        }
    }
    
    // Logging
    public static function logRequest($method, $data = null, $error = null) {
        if (!ENABLE_REQUEST_LOGGING) return;
        
        $log = [
            'timestamp' => date('Y-m-d H:i:s'),
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'method' => $method,
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
        ];
        
        if ($error) {
            $log['error'] = $error;
        }
        
        if (DEBUG_MODE && $data) {
            $log['data'] = $data;
        }
        
        file_put_contents('api.log', json_encode($log) . "\n", FILE_APPEND);
    }
}
?>