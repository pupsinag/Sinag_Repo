# Database Migration Guide

This document provides instructions for migrating the SINAG Internship Management System from Sequelize-based migrations to traditional SQL migrations.

## Migration Files Overview

The migration files are organized as follows:

1. `001_initial_schema.sql` - Complete database schema with all tables
2. `013_data_seeding.sql` - Initial data and sample records
3. `014_existing_data_migration.sql` - Migration of existing data from old system

## Prerequisites

- MySQL 8.0+ installed and running
- Access to the database with appropriate privileges
- Backup of existing database (recommended)

## Migration Steps

### Step 1: Prepare the Environment

1. Ensure MySQL server is running
2. Verify database connection settings in `backend/.env`
3. Create a backup of the existing database

### Step 2: Execute Initial Schema Migration

Run the initial schema migration:

```sql
mysql -u sinag_user -pshck$1N4Gpup -h 127.0.0.1 pup_sinag < backend/migrations/001_initial_schema.sql
```

### Step 3: Execute Data Seeding

Run the data seeding migration:

```sql
mysql -u sinag_user -pshck$1N4Gpup -h 127.0.0.1 pup_sinag < backend/migrations/013_data_seeding.sql
```

### Step 4: Execute Existing Data Migration

If migrating from an existing system, run the existing data migration:

```sql
mysql -u sinag_user -pshck$1N4Gpup -h 127.0.0.1 pup_sinag < backend/migrations/014_existing_data_migration.sql
```

## Verification

After migration, verify the following:

1. All tables are created successfully
2. Foreign key constraints are working
3. Sample data is inserted correctly
4. Application can connect to the new database

## Troubleshooting

### Common Issues

1. **Foreign Key Constraint Errors**: Check the order of table creation
2. **Character Set Issues**: Ensure UTF8MB4 is used throughout
3. **Permission Errors**: Verify database user has sufficient privileges

### Rollback Procedure

If migration fails, restore from backup:

```sql
mysql -u sinag_user -pshck$1N4Gpup -h 127.0.0.1 pup_sinag < backup_file.sql
```

## Migration Notes

- All tables use InnoDB engine for foreign key support
- UTF8MB4 character set is used for full Unicode support
- Proper indexing is implemented for performance
- Foreign key constraints are defined with appropriate actions

## Post-Migration Tasks

1. Update application configuration to use new migration system
2. Test all application features
3. Update documentation
4. Monitor database performance

## Contact

For migration support, contact the development team.