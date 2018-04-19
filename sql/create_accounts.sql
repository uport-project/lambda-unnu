-- Table: public.accounts

-- DROP TABLE public.accounts;

CREATE TABLE public.accounts
(
    address VARCHAR(44) NOT NULL, --Funding account address
    network VARCHAR(64), -- Network name
    nonce integer, --Nonce
    balance integer, --Balance
    pending_tx VARCHAR(128), --Pending tx for address 
    CONSTRAINT accounts_pkey PRIMARY KEY (address,network)
)
WITH (
  OIDS=FALSE
);
ALTER TABLE public.accounts
  OWNER TO root;
