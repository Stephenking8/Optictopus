-- Import using phpMyAdmin after creating a database (utf8mb4, InnoDB).
SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS admins (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 username VARCHAR(80) NOT NULL UNIQUE,
 password_hash VARCHAR(255) NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 last_login_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS categories (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(100) NOT NULL,
 slug VARCHAR(110) NOT NULL UNIQUE,
 sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS projects (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 category_id INT UNSIGNED NULL,
 title VARCHAR(160) NOT NULL,
 slug VARCHAR(180) NOT NULL UNIQUE,
 summary VARCHAR(500) NOT NULL DEFAULT '',
 description TEXT NULL,
 technologies VARCHAR(500) NOT NULL DEFAULT '',
 features TEXT NULL,
 live_url VARCHAR(1000) NULL,
 github_url VARCHAR(1000) NULL,
 cover_image VARCHAR(300) NULL,
 development_status ENUM('completed','ongoing','upcoming') NOT NULL DEFAULT 'ongoing',
 publication ENUM('draft','published') NOT NULL DEFAULT 'draft',
 is_hidden TINYINT(1) NOT NULL DEFAULT 0,
 is_featured TINYINT(1) NOT NULL DEFAULT 0,
 sort_order INT NOT NULL DEFAULT 0,
 show_views TINYINT(1) NULL,
 show_likes TINYINT(1) NULL,
 show_rating TINYINT(1) NULL,
 show_rating_count TINYINT(1) NULL,
 allow_likes TINYINT(1) NULL,
 allow_ratings TINYINT(1) NULL,
 published_at DATETIME NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 deleted_at DATETIME NULL,
 INDEX idx_public (publication,is_hidden,deleted_at,sort_order),
 CONSTRAINT fk_project_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS project_images (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 project_id INT UNSIGNED NOT NULL,
 image_path VARCHAR(300) NOT NULL,
 caption VARCHAR(255) NOT NULL DEFAULT '',
 sort_order INT NOT NULL DEFAULT 0,
 FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
 INDEX (project_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS project_likes (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 project_id INT UNSIGNED NOT NULL,
 visitor_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_like (project_id, visitor_hash),
 FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS project_ratings (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 project_id INT UNSIGNED NOT NULL,
 visitor_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 stars TINYINT UNSIGNED NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uq_rating (project_id,visitor_hash),
 INDEX (project_id,stars),
 FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS visitors (
 visitor_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 first_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 last_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 consented_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS website_visits (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 visitor_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 page_type ENUM('home','project') NOT NULL,
 project_id INT UNSIGNED NULL,
 device_type VARCHAR(16) NOT NULL DEFAULT 'Unknown',
 device_brand VARCHAR(32) NOT NULL DEFAULT 'Unknown',
 device_model VARCHAR(70) NOT NULL DEFAULT 'Unknown Device',
 os_name VARCHAR(60) NOT NULL DEFAULT 'Unknown',
 browser_name VARCHAR(60) NOT NULL DEFAULT 'Unknown',
 country VARCHAR(70) NOT NULL DEFAULT 'Unknown',
 region VARCHAR(100) NOT NULL DEFAULT 'Unknown',
 city VARCHAR(100) NOT NULL DEFAULT 'Unknown',
 visited_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_visits_date (visited_at),
 INDEX idx_visits_visitor (visitor_hash,visited_at),
 INDEX idx_visits_country (country),
 FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS project_views (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 project_id INT UNSIGNED NOT NULL,
 visitor_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_views_project (project_id,viewed_at),
 INDEX idx_views_visitor (visitor_hash,project_id,viewed_at),
 FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS settings (
 `key` VARCHAR(90) PRIMARY KEY,
 `value` TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS social_links (
 platform VARCHAR(32) PRIMARY KEY,
 link VARCHAR(500) NOT NULL DEFAULT '',
 enabled TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS rate_limits (
 key_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 window_start BIGINT UNSIGNED NOT NULL,
 attempts INT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT IGNORE INTO categories (id,name,slug,sort_order) VALUES
 (1,'Web Applications','web-applications',1),(2,'Landing Pages','landing-pages',2),(3,'E-commerce','e-commerce',3);
INSERT IGNORE INTO settings (`key`,`value`) VALUES
 ('site_name','OPTICTOPUS'),('site_description','OPTICTOPUS — See beyond. Build beyond. Creative web development and digital projects.'),
 ('hero_title','See beyond. Build beyond.'),('hero_kicker','OPTICTOPUS / Creative developer · Digital maker'),
 ('hero_text','I design and develop thoughtful websites and creative digital experiences. Explore my projects and see what is possible.'),
 ('owner_name','Your Name'),('professional_title','Full-stack Web Developer'),
 ('about_text','I build functional, accessible digital experiences with a focus on clean design, performance and thoughtful details.'),
 ('skills','HTML,CSS,JavaScript,PHP,MySQL,UI/UX'),('interests','Web development · UI engineering · Digital experiences'),
 ('experience','Available for collaborations and interesting projects.'),('contact_email','hello@example.com'),
 ('profile_image','assets/img/avatar.svg'),('logo_image',''),('favicon_image',''),
 ('accent_color','#A879F5'),('default_theme','dark'),('background_style','glow'),('animations_enabled','1'),
 ('mascot_enabled','1'),('layout_style','grid'),('section_about','1'),('section_projects','1'),('section_contact','1'),
 ('show_views','1'),('show_likes','1'),('show_rating','1'),('show_rating_count','1'),
 ('enable_likes','1'),('enable_ratings','1'),('analytics_enabled','1'),('retention_days','365'),
 ('footer_text','Made with care. All rights reserved.'),('seo_keywords','developer,portfolio,web development,projects');
INSERT IGNORE INTO social_links(platform,link,enabled) VALUES
 ('facebook','',1),('instagram','',1),('telegram','',1),('gmail','',1),('whatsapp','',1),('tiktok','',1);
-- Sample *portfolio content* only; no fabricated likes, ratings, or analytics.
INSERT IGNORE INTO projects (id,category_id,title,slug,summary,description,technologies,features,cover_image,development_status,publication,is_featured,sort_order,published_at) VALUES
 (1,2,'Sample: Aurora Studio','sample-aurora-studio','An expressive landing page concept with immersive visuals and elegant typography.','A sample project entry to demonstrate how your case studies look. Replace this entry and screenshot with your own work.','HTML,CSS,JavaScript','Responsive layout\nAnimated hero\nAccessible navigation','assets/img/sample-aurora.svg','completed','published',1,1,UTC_TIMESTAMP()),
 (2,1,'Sample: Orbit Workspace','sample-orbit-workspace','A productivity dashboard concept designed for focus and clarity.','Illustrative portfolio content only. Add the project features, actual links, and images through the administration area.','PHP,MySQL,JavaScript','Dashboard interface\nProject management\nResponsive design','assets/img/sample-orbit.svg','ongoing','published',0,2,UTC_TIMESTAMP()),
 (3,3,'Sample: Forma Market','sample-forma-market','A minimal storefront concept for carefully curated products.','A third sample showing another category. All engagement metrics start at zero and record real visitor actions only.','HTML,CSS,PHP,MySQL','Catalog layout\nProduct details\nMobile-first cards','assets/img/sample-forma.svg','upcoming','published',0,3,UTC_TIMESTAMP());

INSERT IGNORE INTO project_images (id,project_id,image_path,caption,sort_order) VALUES
 (1,1,'assets/img/sample-aurora.svg','Demo landing page preview',1),
 (2,2,'assets/img/sample-orbit.svg','Demo dashboard preview',1),
 (3,3,'assets/img/sample-forma.svg','Demo storefront preview',1);
