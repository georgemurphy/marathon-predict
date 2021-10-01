WITH bronx_finishes AS (
SELECT  bronx.runnerId,
        concat(left(bronx.pace,4), '0') as bronx_pace_bkt,
        cast(left(bronx.pace, 2) as integer) * 60 + cast(right(bronx.pace,2) as integer) as bronx_pace_sec,
        cast(left(marathon.pace, 2) as integer) * 60 + cast(right(marathon.pace,2) as integer) as marathon_pace_sec,
        (cast(left(bronx.pace, 2) as integer) * 60 + cast(right(bronx.pace,2) as integer)) - (cast(left(marathon.pace, 2) as integer) * 60 + cast(right(marathon.pace,2) as integer)) as pace_diff,
        CASE WHEN ABS(ceiling(((cast(left(bronx.pace, 2) as integer) * 60 + cast(right(bronx.pace,2) as integer)) - (cast(left(marathon.pace, 2) as integer) * 60 + cast(right(marathon.pace,2) as integer))) * 0.1) * 10) > 240 THEN 240 
        ELSE ceiling(((cast(left(bronx.pace, 2) as integer) * 60 + cast(right(bronx.pace,2) as integer)) - (cast(left(marathon.pace, 2) as integer) * 60 + cast(right(marathon.pace,2) as integer))) * 0.1) * 10
        END as pace_diff_bkt,
        marathon.overallTime as marathon_time
FROM
(
SELECT canonicalId,
        runnerId,
       pace, 
       overallTime, 
       event,
       year
FROM `running-viz.data.finishesV2` 
LEFT JOIN `running-viz.data.races` USING (eventCode)
WHERE event = 'Bronx 10M'
) bronx
LEFT JOIN (
SELECT canonicalId, 
       pace, 
       overallTime, 
       event,
       year
FROM `running-viz.data.finishesV2` 
LEFT JOIN `running-viz.data.races` USING (eventCode)
WHERE event = 'NYC Marathon'
) marathon
ON (bronx.canonicalId = marathon.canonicalId AND bronx.year = marathon.year)
WHERE marathon.pace IS NOT NULL
)
SELECT *
FROM (
    SELECT bronx_pace_bkt 
        , pace_diff_bkt 
        , count(*) as runners
    FROM    bronx_finishes
    GROUP BY 1,2
) a
LEFT JOIN (
    SELECT bronx_pace_bkt
            , p10
            , p50
            , p90
    FROM (
    SELECT bronx_pace_bkt
            , ROUND(PERCENTILE_CONT(pace_diff_bkt, 0.1) OVER(PARTITION BY bronx_pace_bkt)) as p10 
            , ROUND(PERCENTILE_CONT(pace_diff_bkt, 0.5) OVER(PARTITION BY bronx_pace_bkt)) as p50 
            , ROUND(PERCENTILE_CONT(pace_diff_bkt, 0.9) OVER(PARTITION BY bronx_pace_bkt)) as p90
    FROM bronx_finishes 
    )
    GROUP BY 1,2,3,4
) b 
ON a.bronx_pace_bkt = b.bronx_pace_bkt
