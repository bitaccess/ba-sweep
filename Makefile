build:
	@uglifyjs src/sweepapp.js --mangle --output public/javascripts/sweepapp.min.js --source-map public/javascripts/sweepapp.min.js.map --source-map-url sweepapp.min.js.map --source-map-root / -p 1
 
lint:
	@eslint .

.PHONY: build lint
