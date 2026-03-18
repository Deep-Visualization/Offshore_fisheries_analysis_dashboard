CREATE TABLE fisheries_Metric_tons(
    Years INT,
    States VARCHAR (100),
    NMFS_Name VARCHAR(100),
    Pounds INT,
    Metric_Tons	INT,
    Dollars INT,
    Confidentiality	VARCHAR,
    Collections VARCHAR,
    Scientific_Name VARCHAR,
	Tsn INT,
    Source VARCHAR

);


DROP TABLE IF EXISTS fisheries_Metric_tons;

CREATE TABLE fisheries_Metric_tons(
    Years INT,
    States VARCHAR (100),
    NMFS_Name VARCHAR(100),
    Pounds BIGINT,
    Metric_Tons	BIGINT,
    Dollars BIGINT,
    Confidentiality	VARCHAR,
    Collections VARCHAR,
    Scientific_Name VARCHAR,
	Tsn BIGINT,
    Source VARCHAR

);

COPY fisheries_Metric_tons(
    Years,
    States,
    NMFS_Name,
    Pounds,
    Metric_Tons,
    Dollars,
    Confidentiality,
    Collections,
    Scientific_Name,
	Tsn,
    Source 
)
FROM 'C:\\tmp\\fisheries.csv'
DELIMITER ','
CSV HEADER;

SELECT *
FROM fisheries_Metric_tons;

SELECT 
    nmfs_name,
    SUM(metric_tons) AS total_metric_tons,
    SUM(pounds) AS total_pounds 
FROM fisheries_Metric_tons
WHERE metric_tons IS NOT NULL
AND pounds IS NOT NULL
GROUP BY nmfs_name
ORDER BY total_metric_tons DESC
LIMIT 10;


