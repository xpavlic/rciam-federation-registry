#!/bin/bash
psql -U postgres -d test_db -a -f './JavaScript/test/setup_test_db.sql'
NODE_ENV=test mocha './JavaScript/test/test.js' --timeout 10000 --bail --exit
