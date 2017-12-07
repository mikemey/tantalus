#!/bin/bash

OP=
SIM_ID=
SIM_REPORTS_FILE=
TRADER_REPORTS_FILE=
DB_FROM_NS=
DB_TO_NS=

SIM_REPORTS_COLLECTION="simulationreports"
TRADER_REPORTS_COLLECTION="traderreports"
REPORTS_QUERY=
EXPORT_OP="export"
IMPORT_OP="import"

TEXT_PREFIX="      "
HEADER_PREFIX=" ====="
INPUT_PREFIX=" ====>"
TEXT_FILE_SUFFIX=".<collectionName>.gz"

echo "$HEADER_PREFIX Exporting/Importing simulation + trader reports"
echo "$TEXT_PREFIX Operation [default: 0]:"
echo "$TEXT_PREFIX  0 - Export to file"
echo "$TEXT_PREFIX  1 - Import from file"

read -p "$INPUT_PREFIX [0]: " userInput
if [ "$userInput" != "1" ]; then
  OP=${EXPORT_OP}
else
  OP=${IMPORT_OP}
fi

while [  -z "$SIM_ID" ]; do
  echo "$HEADER_PREFIX ${OP}ing reports of Simulation ID"
  read -p "$INPUT_PREFIX [<simulationId>]: " SIM_ID
done

REPORTS_QUERY="{ simulationId: \"${SIM_ID}\" }"

echo "$HEADER_PREFIX Prefix of archive files (omit file ending, '$TEXT_FILE_SUFFIX' will be appended)"
read -p "$INPUT_PREFIX [$SIM_ID.<collectionName>.gz]: " userInput
FILE_PREFIX=${userInput:-"$SIM_ID"}

SIM_REPORTS_FILE="$FILE_PREFIX.$SIM_REPORTS_COLLECTION.gz"
TRADER_REPORTS_FILE="$FILE_PREFIX.$TRADER_REPORTS_COLLECTION.gz"

echo "$HEADER_PREFIX Database name"
read -p "$INPUT_PREFIX [tantalus]: " userInput
DB_FROM_NS=${userInput:-tantalus}

if [ "$OP" == "$IMPORT_OP" ]; then
  echo "$HEADER_PREFIX Import database name"
  read -p "$INPUT_PREFIX [copy]: " userInput
  DB_TO_NS=${userInput:-copy}
fi

answer=
echo ""
echo "$HEADER_PREFIX================================================"
echo "$TEXT_PREFIX        SimulationID: $SIM_ID"
echo "$TEXT_PREFIX    Sim reports file: $SIM_REPORTS_FILE"
echo "$TEXT_PREFIX Trader reports file: $TRADER_REPORTS_FILE"
echo "$TEXT_PREFIX     ${OP} database: $DB_FROM_NS${DB_TO_NS:+" =====> $DB_TO_NS"}"
while [ "$answer" != "y" ]; do
  echo "$HEADER_PREFIX Proceed with ${OP}ing (type 'y' to proceed)?"
  read -p "$INPUT_PREFIX " answer
done

if [ "$OP" == "$EXPORT_OP" ]; then
  echo "exporting ..."
  mongodump --db=${DB_FROM_NS} -c simulationreports -q "$REPORTS_QUERY" --archive=${SIM_REPORTS_FILE} --gzip
  mongodump --db=${DB_FROM_NS} -c traderreports -q "$REPORTS_QUERY" --archive=${TRADER_REPORTS_FILE} --gzip
else
  echo "importing..."
  mongorestore --nsFrom "${DB_FROM_NS}.*" --nsTo "${DB_TO_NS}.*" --archive=${SIM_REPORTS_FILE} --gzip
  mongorestore --nsFrom "${DB_FROM_NS}.*" --nsTo "${DB_TO_NS}.*" --archive=${TRADER_REPORTS_FILE} --gzip
fi

echo "done"

