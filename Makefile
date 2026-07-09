.PHONY: install build deploy validate clean configure-schema

PROFILE ?= your-profile
TARGET ?= default

install:
	npm install

build:
	npm run build

validate:
	databricks bundle validate -t $(TARGET) -p $(PROFILE)

deploy: validate
	databricks bundle deploy -t $(TARGET) -p $(PROFILE)
	databricks bundle run app -t $(TARGET) -p $(PROFILE)

deploy-only:
	databricks bundle deploy -t $(TARGET) -p $(PROFILE)

run:
	databricks bundle run app -t $(TARGET) -p $(PROFILE)

clean:
	npm run clean

# Usage: make configure-schema SCHEMA=acme_catalog.genie_cc
configure-schema:
	@test -n "$(SCHEMA)" || (echo "Usage: make configure-schema SCHEMA=catalog.schema"; exit 1)
	./scripts/configure-analytics-schema.sh $(SCHEMA)
