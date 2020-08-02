
CREATE TABLE `Products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `mainImage` varchar(2048) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `price` decimal(18,2) DEFAULT NULL,
  `lastUpdate` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO Products (title, description, mainImage, price) VALUES ('Nintendo Switch with Neon Blue and Neon Red Joy‑Con', 'Get the gaming system that lets you play the games you want, wherever you are, however you like. Includes the Nintendo Switch console and Nintendo Switch dock in black, with contrasting left and right Joy‑Con controllers-one red, one blue. Also includes all the extras you need to get started.', 'https://images-na.ssl-images-amazon.com/images/I/61JnrafZ7zL._AC_SL1457_.jpg', 385.45);
INSERT INTO Products (title, description, mainImage, price) VALUES ('Sony PlayStation 4 Pro 1TB Console - Black (PS4 Pro)', 'Take play to the next level with PS4 Pro: see every detail explode into life with 4K gaming and entertainment, experience faster, smoother frame rates and more powerful gaming performance, and enjoy richer, more vibrant colours with HDR technology.', 'https://images-na.ssl-images-amazon.com/images/I/71jN27mYlhL._SX522_.jpg', 385.45);
INSERT INTO Products (title, description, mainImage, price) VALUES ('Microsoft Xbox One X 1Tb', 'The world's most powerful Console. Games play better on Xbox One x. With 40% more power than any other Console, experience immersive true 4K gaming.', 'https://images-na.ssl-images-amazon.com/images/I/61ux1cU49XL._SX385_.jpg', 385.45);