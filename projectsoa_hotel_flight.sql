/*
SQLyog Community v13.1.7 (64 bit)
MySQL - 10.4.20-MariaDB : Database - soaproject_hotel_flight
*********************************************************************
*/

/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
CREATE DATABASE /*!32312 IF NOT EXISTS*/`soaproject_hotel_flight` /*!40100 DEFAULT CHARACTER SET utf8mb4 */;

USE `soaproject_hotel_flight`;

/*Table structure for table `review` */

DROP TABLE IF EXISTS `review`;

CREATE TABLE `review` (
  `hotel_id` varchar(8) DEFAULT NULL COMMENT 'id hotel amadeus',
  `user_id` int(11) DEFAULT NULL,
  `review_content` text DEFAULT NULL,
  `review_score` smallint(1) DEFAULT NULL COMMENT '1-5',
  `review_date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'updated at'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/*Data for the table `review` */

insert  into `review`(`hotel_id`,`user_id`,`review_content`,`review_score`,`review_date`) values 
('AZJKT134',1,'Sangat bagus interior dan servicenya',5,'2022-06-19 19:47:12');

/*Table structure for table `subscription_plan` */

DROP TABLE IF EXISTS `subscription_plan`;

CREATE TABLE `subscription_plan` (
  `plan_id` int(11) NOT NULL AUTO_INCREMENT,
  `plan_name` varchar(20) NOT NULL,
  `plan_desc` varchar(50) DEFAULT NULL,
  `plan_price` float NOT NULL,
  `plan_hit_amount` int(11) NOT NULL,
  `is_plan_available` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1 = available, 0 = unavailable',
  PRIMARY KEY (`plan_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/*Data for the table `subscription_plan` */

/*Table structure for table `users` */

DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '<inisial><no urut>',
  `apikey` varchar(10) NOT NULL,
  `apihit` int(11) NOT NULL,
  `email` varchar(50) NOT NULL,
  `fname` varchar(50) NOT NULL,
  `lname` varchar(50) NOT NULL,
  `password` varchar(50) NOT NULL,
  `date_of_birth` timestamp NOT NULL DEFAULT current_timestamp(),
  `date_registered` timestamp NOT NULL DEFAULT current_timestamp(),
  `date_updated` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1 = active, 0 = inactive',
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNIQUE_APIKEY` (`apikey`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4;

/*Data for the table `users` */

insert  into `users`(`id`,`apikey`,`apihit`,`email`,`fname`,`lname`,`password`,`date_of_birth`,`date_registered`,`date_updated`,`is_active`) values 
(1,'BAs3XiTqng',5,'gareth05@mail.com','Gareth','Newman','asdfasdf','1994-08-07 00:00:00','2022-05-06 10:04:26','2022-05-06 10:04:26',1),
(2,'yDx4YM74IJ',5,'jayjay.max@mail.com','Jeremy','Kazimir','asdfasdf','2022-05-26 16:05:41','2022-05-26 15:52:49','2022-05-26 16:05:41',1),
(3,'kJFjFArT5o',5,'Mar.see@mail.com','Marceline','Smith','nintendo','2000-10-07 00:00:00','2022-06-11 20:40:19','2022-06-11 21:26:28',1),
(4,'VMIHfwZqTm',5,'KatieHughes123@mail.com','Katie','Hughes','abcd1234','1999-10-19 00:00:00','2022-06-11 21:27:46','2022-06-11 21:27:46',1);

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
