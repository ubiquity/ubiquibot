CREATE TABLE IF NOT EXISTS Settlements (
    id  serial PRIMARY KEY,
    created  timestamptz NOT NULL,
    updated  timestamptz NOT NULL,	
    userId 	 int8 NOT NULL,
    orgId 	 int8 NOT NULL,
    repoId   int8 NOT NULL,
    issueId  int8 NOT NULL,
    creditId int8 NOT NULL,
    debitId  int8 NOT NULL,
);