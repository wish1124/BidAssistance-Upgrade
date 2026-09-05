-- MySQL Workbench Forward Engineering
-- -----------------------------------------------------
-- Schema aivleTK
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `aivleTK` DEFAULT CHARACTER SET utf8mb4; -- 1. 스키마가 없으면 생성
USE `aivleTK`;

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema aivleTK
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Table `company`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `company` ;

CREATE TABLE IF NOT EXISTS `company` (
  `company_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(15) NOT NULL,
  `position` VARCHAR(50) NULL,
  PRIMARY KEY (`company_id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `user`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `user` ;

CREATE TABLE IF NOT EXISTS `user` (
  `user_id` INT NOT NULL AUTO_INCREMENT,
  `company_id` INT NULL,
  `email` VARCHAR(25) NOT NULL,
  `name` VARCHAR(10) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` TINYINT NOT NULL,
  `birth` DATE NOT NULL,
  `question` TINYINT NOT NULL,
  `answer` VARCHAR(50) NOT NULL,
  `expert_level` INT NOT NULL DEFAULT 1,
  `expert_points` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`user_id`),
  INDEX `fk_user_company1_idx` (`company_id` ASC) VISIBLE,
  UNIQUE INDEX `email_UNIQUE` (`email` ASC) VISIBLE,
  UNIQUE INDEX `user_id_UNIQUE` (`user_id` ASC) VISIBLE,
  CONSTRAINT `fk_user_company1`
    FOREIGN KEY (`company_id`)
    REFERENCES `company` (`company_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `bid`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `bid` ;

CREATE TABLE IF NOT EXISTS `bid` (
  `bid_id` INT NOT NULL AUTO_INCREMENT,
  `bid_real_id` VARCHAR(20) NOT NULL,
  `name` VARCHAR(100) NOT NULL,

  `start_date` TIMESTAMP NOT NULL,
  `end_date` TIMESTAMP NULL,
  `open_date` TIMESTAMP NOT NULL,
  `bid_created` TIMESTAMP NOT NULL,
  `region` VARCHAR(50) NOT NULL,
  `organization` VARCHAR(50) NOT NULL,
  `bid_URL` VARCHAR(300) NOT NULL,

  `estimate_price` BIGINT NULL,
  `basic_price` BIGINT NULL,
  `minimum_bid_rate` DOUBLE NULL,
  `bid_range` DOUBLE NULL,
  PRIMARY KEY (`bid_id`),
  UNIQUE INDEX `bid_id_UNIQUE` (`bid_id` ASC) VISIBLE,
  UNIQUE INDEX `bid_real_id_UNIQUE` (`bid_real_id` ASC) VISIBLE)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `alarm`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `alarm` ;

CREATE TABLE IF NOT EXISTS `alarm` (
  `alarm_id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `bid_id` INT NOT NULL,
  `alarm_content` VARCHAR(100) NOT NULL,
  `alarm_type` VARCHAR(20) NOT NULL DEFAULT 'SYSTEM',
  `alarm_date` TIMESTAMP NULL,
  PRIMARY KEY (`alarm_id`),
  INDEX `fk_alarm_user_idx` (`user_id` ASC) VISIBLE,
  INDEX `fk_alarm_bid1_idx` (`bid_id` ASC) VISIBLE,
  UNIQUE INDEX `alarm_id_UNIQUE` (`alarm_id` ASC) VISIBLE,
  CONSTRAINT `fk_alarm_user`
    FOREIGN KEY (`user_id`)
    REFERENCES `user` (`user_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_alarm_bid1`
    FOREIGN KEY (`bid_id`)
    REFERENCES `bid` (`bid_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `wishlist`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `wishlist` ;

CREATE TABLE IF NOT EXISTS `wishlist` (
  `wishlist_id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `bid_id` INT NOT NULL,
  `wishlist_stage` TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`wishlist_id`),
  INDEX `fk_alarm_user_idx` (`user_id` ASC) VISIBLE,
  INDEX `fk_alarm_bid1_idx` (`bid_id` ASC) VISIBLE,
  CONSTRAINT `fk_alarm_user0`
    FOREIGN KEY (`user_id`)
    REFERENCES `user` (`user_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_alarm_bid10`
    FOREIGN KEY (`bid_id`)
    REFERENCES `bid` (`bid_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `user_search_keyword`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `user_search_keyword` ;

CREATE TABLE IF NOT EXISTS `user_search_keyword` (
  `user_search_keyword_id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `keyword` VARCHAR(50) NOT NULL,
  `min_price` BIGINT NULL,
  `max_price` BIGINT NULL,
  PRIMARY KEY (`user_search_keyword_id`),
  INDEX `fk_user_search_keyword_user1_idx` (`user_id` ASC) VISIBLE,
  CONSTRAINT `fk_user_search_keyword_user1`
    FOREIGN KEY (`user_id`)
    REFERENCES `user` (`user_id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `analysis_result`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `analysis_result` ;

CREATE TABLE IF NOT EXISTS `analysis_result` (
  `analysis_result_id` INT NOT NULL AUTO_INCREMENT,
  `bid_id` INT NOT NULL,
  `golden_rate` DECIMAL NULL,
  `predicted_price` BIGINT NOT NULL,
  `avg_rate` DECIMAL NULL,
  `analysis_date` DATETIME NOT NULL,
  `pdf_url` VARCHAR(500) NOT NULL,
  `analysis_content` VARCHAR(1000) NULL,
  `contract_method` VARCHAR(500) NULL,
  `track_record` VARCHAR(500) NULL,
  `qualification` VARCHAR(500) NULL,
  PRIMARY KEY (`analysis_result_id`),
  INDEX `fk_analysis_result_bid1_idx` (`bid_id` ASC) VISIBLE,
  UNIQUE INDEX `predicted_price_UNIQUE` (`predicted_price` ASC) VISIBLE,
  CONSTRAINT `fk_analysis_result_bid1`
    FOREIGN KEY (`bid_id`)
    REFERENCES `bid` (`bid_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `bid_log`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `bid_log` ;

CREATE TABLE IF NOT EXISTS `bid_log` (
  `bid_log_id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `bid_id` INT NOT NULL,
  `date` TIMESTAMP NOT NULL,
  PRIMARY KEY (`bid_log_id`),
  INDEX `fk_bid_log_user1_idx` (`user_id` ASC) VISIBLE,
  INDEX `fk_bid_log_bid1_idx` (`bid_id` ASC) VISIBLE,
  UNIQUE INDEX `bid_log_id_UNIQUE` (`bid_log_id` ASC) VISIBLE,
  CONSTRAINT `fk_bid_log_user1`
    FOREIGN KEY (`user_id`)
    REFERENCES `user` (`user_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_bid_log_bid1`
    FOREIGN KEY (`bid_id`)
    REFERENCES `bid` (`bid_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `board`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `board` ;

CREATE TABLE IF NOT EXISTS `board` (
  `board_id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `title` VARCHAR(50) NOT NULL,
  `content` VARCHAR(500) NOT NULL,
  `category` VARCHAR(20) NOT NULL,
  `like_count` INT NOT NULL,
  `view_count` INT NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP NULL,
  `adopted_comment_id` INT NULL,
  PRIMARY KEY (`board_id`),
  INDEX `fk_board_user1_idx` (`user_id` ASC) VISIBLE,
  UNIQUE INDEX `board_id_UNIQUE` (`board_id` ASC) VISIBLE,
  CONSTRAINT `fk_board_user1`
    FOREIGN KEY (`user_id`)
    REFERENCES `user` (`user_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `comment`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `comment` ;

CREATE TABLE IF NOT EXISTS `comment` (
  `comment_id` INT NOT NULL AUTO_INCREMENT,
  `content` VARCHAR(300) NOT NULL,
  `comment_date` TIMESTAMP NOT NULL,
  `bid_id` INT NULL,
  `board_id` INT NULL,
  `parent_comment_id` INT NULL,
  `users_user_id` INT NOT NULL,
  `is_adopted` BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (`comment_id`),
  INDEX `fk_comment_bid1_idx` (`bid_id` ASC) VISIBLE,
  INDEX `fk_comment_board1_idx` (`board_id` ASC) VISIBLE,
  INDEX `fk_comment_comment1_idx` (`parent_comment_id` ASC) VISIBLE,
  INDEX `fk_comment_user1_idx` (`users_user_id` ASC) VISIBLE,
  UNIQUE INDEX `comment_id_UNIQUE` (`comment_id` ASC) VISIBLE,
  CONSTRAINT `fk_comment_bid1`
    FOREIGN KEY (`bid_id`)
    REFERENCES `bid` (`bid_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_comment_board1`
    FOREIGN KEY (`board_id`)
    REFERENCES `board` (`board_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_comment_comment1`
    FOREIGN KEY (`parent_comment_id`)
    REFERENCES `comment` (`comment_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_comment_user1`
    FOREIGN KEY (`users_user_id`)
    REFERENCES `user` (`user_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `attachment`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `attachment` ;

CREATE TABLE IF NOT EXISTS `attachment` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `file_name` VARCHAR(255) NOT NULL,
  `store_name` VARCHAR(255) NULL,
  `url` VARCHAR(1000) NOT NULL,
  `bid_id` INT NULL,
  `board_id` INT NULL,
  `analysis_result_id` INT NULL,
  PRIMARY KEY (`id`),
  INDEX `fk_attachment_bid1_idx` (`bid_id` ASC) VISIBLE,
  INDEX `fk_attachment_board1_idx` (`board_id` ASC) VISIBLE,
  INDEX `fk_attachment_analysis_result1_idx` (`analysis_result_id` ASC) VISIBLE,
  UNIQUE INDEX `store_name_UNIQUE` (`store_name` ASC) VISIBLE,
  CONSTRAINT `fk_attachment_bid1`
    FOREIGN KEY (`bid_id`)
    REFERENCES `bid` (`bid_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_attachment_board1`
    FOREIGN KEY (`board_id`)
    REFERENCES `board` (`board_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_attachment_analysis_result1`
    FOREIGN KEY (`analysis_result_id`)
    REFERENCES `analysis_result` (`analysis_result_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;

