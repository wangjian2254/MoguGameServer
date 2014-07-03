/*
SQLyog 企业版 - MySQL GUI v7.14 
MySQL - 5.5.36 : Database - mogugame
*********************************************************************
*/

/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;

/*Table structure for table `gameroom` */

CREATE TABLE `gameroom` (
  `appcode` varchar(100) NOT NULL,
  `roominfo` text,
  `timeline` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`appcode`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;