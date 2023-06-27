CREATE TABLE Ad
(
    AdID         INT AUTO_INCREMENT PRIMARY KEY,
    Title        TEXT NULL,
    Price        TEXT NULL,
    Size         TEXT NULL,
    Description  TEXT NULL,
    Floors       VARCHAR(20) NULL,
    Year         VARCHAR(4) NULL,
    Path         TEXT NULL,
    PathID       INT NULL,
    Url          TEXT NULL,
    DateCreated  DATETIME DEFAULT CURRENT_TIMESTAMP() NULL,
    DateLastSeen DATETIME DEFAULT CURRENT_TIMESTAMP() NULL
);
