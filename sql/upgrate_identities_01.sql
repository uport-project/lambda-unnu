-- Create temporary table with all data;
SELECT *
  INTO temp_table
  FROM public.identities;

-- delete old table;

DROP TABLE public.identities;

-- Create new table;
CREATE TABLE public.identities
(
    tx_hash VARCHAR(128) NOT NULL, --Tx Hash of the identity creation
    device_key VARCHAR(44) NOT NULL, --Device Key
    network VARCHAR(64) NOT NULL, -- Network name
    manager_type VARCHAR(64) NULL, --Identity manager type
    manager_address VARCHAR(44) NULL, --Identity manager address
    tx_options JSONB NULL, --Transaction Options,
    identity VARCHAR(44) NULL, --Proxy contract address,
    tx_receipt JSONB NULL, --Transaction Receipt,
    created timestamp with time zone  NOT NULL DEFAULT now(), --Created on
    updated timestamp with time zone      NULL, --Updated on
    CONSTRAINT identities_pkey PRIMARY KEY (tx_hash)
)
WITH (
  OIDS=FALSE
);
ALTER TABLE public.identities
  OWNER TO root;


-- Fill new table with data;

INSERT INTO public.identities(
    tx_hash,
    device_key,
    network,
    manager_type,
    manager_address,
    identity,
    created
)
SELECT tx_hash,
    device_key,
    network,
    manager_type,
    manager_address,
    identity,
    created
  FROM temp_table;



-- drop temp table;

DROP TABLE temp_table;