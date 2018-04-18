SELECT day, network, sum(pending) as pending, sum(created) as created
  FROM (
	SELECT date_trunc('day', created) as day, network, count(*) as pending, 0 as created
	  FROM identities
	 WHERE identity IS NULL
	   AND created < now() - INTERVAL '1 hour' --Only pending for more than 1 hour
	 GROUP BY day,network
	UNION ALL
	SELECT date_trunc('day', created) as day, network, 0 as pending, count(*) as created
	  FROM identities
	 WHERE identity IS NOT NULL
	 GROUP BY day,network
 ) t
 GROUP BY day, network
 ORDER BY day desc, network desc
 