CREATE OR REPLACE PROCEDURE {{database_name}}.{{schema}}.{{spName}}(day date, timezone varchar) 
 LANGUAGE plpgsql
AS $$ 
DECLARE 

BEGIN

DELETE FROM {{database_name}}.{{schema}}.{{viewName}} where event_date = day;

drop table if exists event_traffic_tmp_tb;
create temp table event_traffic_tmp_tb as (
    SELECT 
        merged_user_id as user_id,
        session_id,
        COUNT(DISTINCT event_id) AS event_count,
        SUM(CASE WHEN event_name = '_page_view' OR event_name = '_screen_view' THEN 1 ELSE 0 END) AS session_views,
        MAX(session_duration) AS session_duration,
        SUM(user_engagement_time_msec) AS user_engagement_time_msec,
        CASE WHEN
           SUM(CASE WHEN event_name = '_page_view' OR event_name = '_screen_view' THEN 1 ELSE 0 END) > 1 
         OR MAX(session_duration) > 10000  THEN 1 ELSE 0 
        END AS session_indicator,
        MAX(CASE WHEN event_name = '_first_open' THEN 1 ELSE 0 END) AS new_user_indicator
    FROM 
        {{database_name}}.{{schema}}.{{baseView}}
    WHERE
        DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = day
    GROUP BY 
        1,2
);

-- first_traffic_source
INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
    event_date,
    aggregation_type,
    aggregation_dim,
    platform, 
    user_id,
    new_user_count,
    session_count,
    engagement_session_count,
    engagement_rate,
    avg_user_engagement_time_minutes,
    event_count
)
with tmp2 AS (
    SELECT 
        session_id,
        platform,
        MAX(first_traffic_source) AS first_traffic_source
    FROM 
        {{database_name}}.{{schema}}.{{baseView}}
    WHERE 
        DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = day
    GROUP BY 
        1, 2
)
SELECT 
    day::date AS event_date,
    'Traffic Source' as aggregation_type,
    tmp2.first_traffic_source as aggregation_dim,
    tmp2.platform,
    user_id,
    SUM(tmp1.new_user_indicator) AS new_user_count,
    COUNT(tmp1.session_id) AS session_count,
    SUM(tmp1.session_indicator) AS engagement_session_count,
    SUM(tmp1.session_indicator) / SUM(tmp1.event_count) AS engagement_rate,
    SUM(user_engagement_time_msec):: double precision / 1000 / 60 / COUNT(tmp1.session_id) AS avg_user_engagement_time_minutes,
    SUM(tmp1.event_count) AS event_count
FROM 
    tmp2
JOIN 
    event_traffic_tmp_tb tmp1 ON tmp2.session_id = tmp1.session_id
GROUP BY 
    1, 2, 3, 4, 5;

-- first_traffic_source / medium
INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
    event_date,
    aggregation_type,
    aggregation_dim,
    platform, 
    user_id,
    new_user_count,
    session_count,
    engagement_session_count,
    engagement_rate,
    avg_user_engagement_time_minutes,
    event_count
)
with tmp2 AS (
    SELECT 
        session_id,
        platform,
        MAX(first_traffic_source) AS first_traffic_source,
        MAX(first_traffic_medium) AS first_traffic_medium
    FROM 
        {{database_name}}.{{schema}}.{{baseView}}
    WHERE 
        DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = day
    GROUP BY 
        1, 2
)
SELECT 
    day::date AS event_date,
    'Traffic Source / Medium' as aggregation_type,
    tmp2.first_traffic_source || ' / ' || tmp2.first_traffic_medium as aggregation_dim,
    tmp2.platform,
    user_id,
    SUM(tmp1.new_user_indicator) AS new_user_count,
    COUNT(tmp1.session_id) AS session_count,
    SUM(tmp1.session_indicator) AS engagement_session_count,
    SUM(tmp1.session_indicator) / SUM(tmp1.event_count) AS engagement_rate,
    SUM(user_engagement_time_msec):: double precision / 1000 / 60  / COUNT(tmp1.session_id) AS avg_user_engagement_time_minutes,
    SUM(tmp1.event_count) AS event_count
FROM 
    tmp2
JOIN 
    event_traffic_tmp_tb tmp1 ON tmp2.session_id = tmp1.session_id
GROUP BY 
    1, 2, 3, 4, 5;

-- first_traffic_medium
INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
    event_date,
    aggregation_type,
    aggregation_dim,
    platform, 
    user_id,
    new_user_count,
    session_count,
    engagement_session_count,
    engagement_rate,
    avg_user_engagement_time_minutes,
    event_count
)
with tmp2 AS (
    SELECT 
        session_id,
        platform,
        MAX(first_traffic_medium) AS first_traffic_medium
    FROM 
        {{database_name}}.{{schema}}.{{baseView}}
    WHERE 
        DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = day
    GROUP BY 
        1, 2
)
SELECT 
    day::date AS event_date,
    'Traffic Medium' as aggregation_type,
    tmp2.first_traffic_medium as aggregation_dim,
    tmp2.platform,
    user_id,
    SUM(tmp1.new_user_indicator) AS new_user_count,
    COUNT(tmp1.session_id) AS session_count,
    SUM(tmp1.session_indicator) AS engagement_session_count,
    SUM(tmp1.session_indicator) / SUM(tmp1.event_count) AS engagement_rate,
    SUM(user_engagement_time_msec):: double precision / 1000 / 60  / COUNT(tmp1.session_id) AS avg_user_engagement_time_minutes,
    SUM(tmp1.event_count) AS event_count
FROM 
    tmp2
JOIN 
    event_traffic_tmp_tb tmp1 ON tmp2.session_id = tmp1.session_id
GROUP BY 
    1, 2, 3, 4, 5;

-- first_traffic_campaign
INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
    event_date,
    aggregation_type,
    aggregation_dim,
    platform, 
    user_id,
    new_user_count,
    session_count,
    engagement_session_count,
    engagement_rate,
    avg_user_engagement_time_minutes,
    event_count
)
with tmp2 AS (
    SELECT 
        session_id,
        platform,
        MAX(first_traffic_campaign) AS first_traffic_campaign
    FROM 
        {{database_name}}.{{schema}}.{{baseView}}
    WHERE 
        DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = day
    GROUP BY 
        1, 2
)
SELECT 
    day::date AS event_date,
    'Traffic Campaign' as aggregation_type,
    tmp2.first_traffic_campaign as aggregation_dim,
    tmp2.platform,
    user_id,
    SUM(tmp1.new_user_indicator) AS new_user_count,
    COUNT(tmp1.session_id) AS session_count,
    SUM(tmp1.session_indicator) AS engagement_session_count,
    SUM(tmp1.session_indicator) / SUM(tmp1.event_count) AS engagement_rate,
    SUM(user_engagement_time_msec):: double precision / 1000 / 60  / COUNT(tmp1.session_id) AS avg_user_engagement_time_minutes,
    SUM(tmp1.event_count) AS event_count
FROM 
    tmp2
JOIN 
    event_traffic_tmp_tb tmp1 ON tmp2.session_id = tmp1.session_id
GROUP BY 
    1, 2, 3, 4, 5;


-- first_traffic_clid_platform
INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
    event_date,
    aggregation_type,
    aggregation_dim,
    platform, 
    user_id,
    new_user_count,
    session_count,
    engagement_session_count,
    engagement_rate,
    avg_user_engagement_time_minutes,
    event_count
)
with tmp2 AS (
    SELECT 
        session_id,
        platform,
        MAX(first_traffic_clid_platform) AS first_traffic_clid_platform
    FROM 
        {{database_name}}.{{schema}}.{{baseView}}
    WHERE 
        DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = day
    GROUP BY 
        1, 2
)
SELECT 
    day::date AS event_date,
    'Traffic Clid Platform' as aggregation_type,
    tmp2.first_traffic_clid_platform as aggregation_dim,
    tmp2.platform,
    user_id,
    SUM(tmp1.new_user_indicator) AS new_user_count,
    COUNT(tmp1.session_id) AS session_count,
    SUM(tmp1.session_indicator) AS engagement_session_count,
    SUM(tmp1.session_indicator) / SUM(tmp1.event_count) AS engagement_rate,
    SUM(user_engagement_time_msec):: double precision / 1000 / 60  / COUNT(tmp1.session_id) AS avg_user_engagement_time_minutes,
    SUM(tmp1.event_count) AS event_count
FROM 
    tmp2
JOIN 
    event_traffic_tmp_tb tmp1 ON tmp2.session_id = tmp1.session_id
GROUP BY 
    1, 2, 3, 4, 5;


-- first_traffic_channel_group,
INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
    event_date,
    aggregation_type,
    aggregation_dim,
    platform, 
    user_id,
    new_user_count,
    session_count,
    engagement_session_count,
    engagement_rate,
    avg_user_engagement_time_minutes,
    event_count
)
with tmp2 AS (
    SELECT 
        session_id,
        platform,
        MAX(first_traffic_channel_group) AS first_traffic_channel_group
    FROM 
        {{database_name}}.{{schema}}.{{baseView}}
    WHERE 
        DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = day
    GROUP BY 
        1, 2
)
SELECT 
    day::date AS event_date,
    'Traffic Channel Group' as aggregation_type,
    tmp2.first_traffic_channel_group as aggregation_dim,
    tmp2.platform,
    user_id,
    SUM(tmp1.new_user_indicator) AS new_user_count,
    COUNT(tmp1.session_id) AS session_count,
    SUM(tmp1.session_indicator) AS engagement_session_count,
    SUM(tmp1.session_indicator) / SUM(tmp1.event_count) AS engagement_rate,
    SUM(user_engagement_time_msec):: double precision / 1000 / 60  / COUNT(tmp1.session_id) AS avg_user_engagement_time_minutes,
    SUM(tmp1.event_count) AS event_count
FROM 
    tmp2
JOIN 
    event_traffic_tmp_tb tmp1 ON tmp2.session_id = tmp1.session_id
GROUP BY 
    1, 2, 3, 4, 5;


-- first_app_install_source
INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
    event_date,
    aggregation_type,
    aggregation_dim,
    platform, 
    user_id,
    new_user_count,
    session_count,
    engagement_session_count,
    engagement_rate,
    avg_user_engagement_time_minutes,
    event_count
)
with tmp2 AS (
    SELECT 
        session_id,
        platform,
        MAX(first_app_install_source) AS first_app_install_source
    FROM 
        {{database_name}}.{{schema}}.{{baseView}}
    WHERE 
        DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = day
    GROUP BY 
        1, 2
)
SELECT 
    day::date AS event_date,
    'App Install Source' as aggregation_type,
    tmp2.first_app_install_source as aggregation_dim,
    tmp2.platform,
    user_id,
    SUM(tmp1.new_user_indicator) AS new_user_count,
    COUNT(tmp1.session_id) AS session_count,
    SUM(tmp1.session_indicator) AS engagement_session_count,
    SUM(tmp1.session_indicator) / SUM(tmp1.event_count) AS engagement_rate,
    SUM(user_engagement_time_msec):: double precision / 1000 / 60  / COUNT(tmp1.session_id) AS avg_user_engagement_time_minutes,
    SUM(tmp1.event_count) AS event_count
FROM 
    tmp2
JOIN 
    event_traffic_tmp_tb tmp1 ON tmp2.session_id = tmp1.session_id
GROUP BY 
    1, 2, 3, 4, 5;


-- session_source,
INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
    event_date,
    aggregation_type,
    aggregation_dim,
    platform, 
    user_id,
    new_user_count,
    session_count,
    engagement_session_count,
    engagement_rate,
    avg_user_engagement_time_minutes,
    event_count
)
with tmp2 AS (
    SELECT 
        session_id,
        platform,
        MAX(session_source) AS session_source
    FROM 
        {{database_name}}.{{schema}}.{{baseView}}
    WHERE 
        DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = day
    GROUP BY 
        1, 2
)
SELECT 
    day::date AS event_date,
    'Session Source' as aggregation_type,
    tmp2.session_source as aggregation_dim,
    tmp2.platform,
    user_id,
    SUM(tmp1.new_user_indicator) AS new_user_count,
    COUNT(tmp1.session_id) AS session_count,
    SUM(tmp1.session_indicator) AS engagement_session_count,
    SUM(tmp1.session_indicator) / SUM(tmp1.event_count) AS engagement_rate,
    SUM(user_engagement_time_msec):: double precision / 1000 / 60  / COUNT(tmp1.session_id) AS avg_user_engagement_time_minutes,
    SUM(tmp1.event_count) AS event_count
FROM 
    tmp2
JOIN 
    event_traffic_tmp_tb tmp1 ON tmp2.session_id = tmp1.session_id
GROUP BY 
    1, 2, 3, 4, 5;

-- session_medium,
INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
    event_date,
    aggregation_type,
    aggregation_dim,
    platform, 
    user_id,
    new_user_count,
    session_count,
    engagement_session_count,
    engagement_rate,
    avg_user_engagement_time_minutes,
    event_count
)
with tmp2 AS (
    SELECT 
        session_id,
        platform,
        MAX(session_medium) AS session_medium
    FROM 
        {{database_name}}.{{schema}}.{{baseView}}
    WHERE 
        DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = day
    GROUP BY 
        1, 2
)
SELECT 
    day::date AS event_date,
    'Session Medium' as aggregation_type,
    tmp2.session_medium as aggregation_dim,
    tmp2.platform,
    user_id,
    SUM(tmp1.new_user_indicator) AS new_user_count,
    COUNT(tmp1.session_id) AS session_count,
    SUM(tmp1.session_indicator) AS engagement_session_count,
    SUM(tmp1.session_indicator) / SUM(tmp1.event_count) AS engagement_rate,
    SUM(user_engagement_time_msec):: double precision / 1000 / 60  / COUNT(tmp1.session_id) AS avg_user_engagement_time_minutes,
    SUM(tmp1.event_count) AS event_count
FROM 
    tmp2
JOIN 
    event_traffic_tmp_tb tmp1 ON tmp2.session_id = tmp1.session_id
GROUP BY 
    1, 2, 3, 4, 5;

-- session_source / medium,
INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
    event_date,
    aggregation_type,
    aggregation_dim,
    platform, 
    user_id,
    new_user_count,
    session_count,
    engagement_session_count,
    engagement_rate,
    avg_user_engagement_time_minutes,
    event_count
)
with tmp2 AS (
    SELECT 
        session_id,
        platform,
        MAX(session_source) AS session_source,
        MAX(session_medium) AS session_medium
    FROM 
        {{database_name}}.{{schema}}.{{baseView}}
    WHERE 
        DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = day
    GROUP BY 
        1, 2
)
SELECT 
    day::date AS event_date,
    'Session Source / Medium' as aggregation_type,
    tmp2.session_source || ' / ' || tmp2.session_medium as aggregation_dim,
    tmp2.platform,
    user_id,
    SUM(tmp1.new_user_indicator) AS new_user_count,
    COUNT(tmp1.session_id) AS session_count,
    SUM(tmp1.session_indicator) AS engagement_session_count,
    SUM(tmp1.session_indicator) / SUM(tmp1.event_count) AS engagement_rate,
    SUM(user_engagement_time_msec):: double precision / 1000 / 60  / COUNT(tmp1.session_id) AS avg_user_engagement_time_minutes,
    SUM(tmp1.event_count) AS event_count
FROM 
    tmp2
JOIN 
    event_traffic_tmp_tb tmp1 ON tmp2.session_id = tmp1.session_id
GROUP BY 
    1, 2, 3, 4, 5;


-- session_campaign,
INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
    event_date,
    aggregation_type,
    aggregation_dim,
    platform, 
    user_id,
    new_user_count,
    session_count,
    engagement_session_count,
    engagement_rate,
    avg_user_engagement_time_minutes,
    event_count
)
with tmp2 AS (
    SELECT 
        session_id,
        platform,
        MAX(session_campaign) AS session_campaign
    FROM 
        {{database_name}}.{{schema}}.{{baseView}}
    WHERE 
        DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = day
    GROUP BY 
        1, 2
)
SELECT 
    day::date AS event_date,
    'Session Campaign' as aggregation_type,
    tmp2.session_campaign as aggregation_dim,
    tmp2.platform,
    user_id,
    SUM(tmp1.new_user_indicator) AS new_user_count,
    COUNT(tmp1.session_id) AS session_count,
    SUM(tmp1.session_indicator) AS engagement_session_count,
    SUM(tmp1.session_indicator) / SUM(tmp1.event_count) AS engagement_rate,
    SUM(user_engagement_time_msec):: double precision / 1000 / 60  / COUNT(tmp1.session_id) AS avg_user_engagement_time_minutes,
    SUM(tmp1.event_count) AS event_count
FROM 
    tmp2
JOIN 
    event_traffic_tmp_tb tmp1 ON tmp2.session_id = tmp1.session_id
GROUP BY 
    1, 2, 3, 4, 5;

-- session_clid_platform,
INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
    event_date,
    aggregation_type,
    aggregation_dim,
    platform, 
    user_id,
    new_user_count,
    session_count,
    engagement_session_count,
    engagement_rate,
    avg_user_engagement_time_minutes,
    event_count
)
with tmp2 AS (
    SELECT 
        session_id,
        platform,
        MAX(session_clid_platform) AS session_clid_platform
    FROM 
        {{database_name}}.{{schema}}.{{baseView}}
    WHERE 
        DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = day
    GROUP BY 
        1, 2
)
SELECT 
    day::date AS event_date,
    'Session Clid Platform' as aggregation_type,
    tmp2.session_clid_platform as aggregation_dim,
    tmp2.platform,
    user_id,
    SUM(tmp1.new_user_indicator) AS new_user_count,
    COUNT(tmp1.session_id) AS session_count,
    SUM(tmp1.session_indicator) AS engagement_session_count,
    SUM(tmp1.session_indicator) / SUM(tmp1.event_count) AS engagement_rate,
    SUM(user_engagement_time_msec):: double precision / 1000 / 60  / COUNT(tmp1.session_id) AS avg_user_engagement_time_minutes,
    SUM(tmp1.event_count) AS event_count
FROM 
    tmp2
JOIN 
    event_traffic_tmp_tb tmp1 ON tmp2.session_id = tmp1.session_id
GROUP BY 
    1, 2, 3, 4, 5;

-- session_channel_group
INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
    event_date,
    aggregation_type,
    aggregation_dim,
    platform, 
    user_id,
    new_user_count,
    session_count,
    engagement_session_count,
    engagement_rate,
    avg_user_engagement_time_minutes,
    event_count
)
with tmp2 AS (
    SELECT 
        session_id,
        platform,
        MAX(session_channel_group) AS session_channel_group
    FROM 
        {{database_name}}.{{schema}}.{{baseView}}
    WHERE 
        DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = day
    GROUP BY 
        1, 2
)
SELECT 
    day::date AS event_date,
    'Session Channel Group' as aggregation_type,
    tmp2.session_channel_group as aggregation_dim,
    tmp2.platform,
    user_id,
    SUM(tmp1.new_user_indicator) AS new_user_count,
    COUNT(tmp1.session_id) AS session_count,
    SUM(tmp1.session_indicator) AS engagement_session_count,
    SUM(tmp1.session_indicator) / SUM(tmp1.event_count) AS engagement_rate,
    SUM(user_engagement_time_msec):: double precision / 1000 / 60  / COUNT(tmp1.session_id) AS avg_user_engagement_time_minutes,
    SUM(tmp1.event_count) AS event_count
FROM 
    tmp2
JOIN 
    event_traffic_tmp_tb tmp1 ON tmp2.session_id = tmp1.session_id
GROUP BY 
    1, 2, 3, 4, 5;


DROP TABLE IF EXISTS event_traffic_tmp_tb;

EXCEPTION WHEN OTHERS THEN
    call {{database_name}}.{{schema}}.sp_clickstream_log('{{viewName}}', 'error', 'error message:' || SQLERRM);
    RAISE INFO 'error message: %', SQLERRM;
END;      
$$;