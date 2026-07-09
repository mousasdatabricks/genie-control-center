.PHONY: install build deploy clean configure-schema

PROFILE ?= your-profile

install:
	npm install

build:
	npm run build

deploy:
	databricks bundle deploy -t default -p $(PROFILE)
	databricks bundle run app -t default -p $(PROFILE)

clean:
	npm run clean

# Usage: make configure-schema SCHEMA=acme_catalog.genie_cc
configure-schema:
	@test -n "$(SCHEMA)" || (echo "Usage: make configure-schema SCHEMA=catalog.schema"; exit 1)
	./scripts/configure-analytics-schema.sh $(SCHEMA)
