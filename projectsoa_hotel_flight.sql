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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/*Data for the table `users` */

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
