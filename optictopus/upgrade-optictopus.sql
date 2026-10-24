-- Import ONLY for an existing NOVA database, after backing it up.
-- Each change is conditional: customized settings remain untouched.
UPDATE settings SET `value`='OPTICTOPUS'
 WHERE `key`='site_name' AND `value`='NOVA / Developer';
UPDATE settings SET `value`='OPTICTOPUS — See beyond. Build beyond. Creative web development and digital projects.'
 WHERE `key`='site_description' AND `value`='Designing thoughtful digital experiences and building for the web.';
UPDATE settings SET `value`='See beyond. Build beyond.'
 WHERE `key`='hero_title' AND `value`='Building the web, one idea at a time.';
UPDATE settings SET `value`='OPTICTOPUS / Creative developer · Digital maker'
 WHERE `key`='hero_kicker' AND `value`='Creative developer · Digital maker';
UPDATE settings SET `value`='I design and develop thoughtful websites and creative digital experiences. Explore my projects and see what is possible.'
 WHERE `key`='hero_text' AND `value`='I create modern, useful and engaging websites. Explore selected projects and the process behind them.';
UPDATE settings SET `value`='#A879F5'
 WHERE `key`='accent_color' AND `value`='#8b7cff';
INSERT IGNORE INTO settings (`key`,`value`) VALUES ('mascot_enabled','1');
