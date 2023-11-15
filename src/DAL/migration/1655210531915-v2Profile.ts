import { MigrationInterface, QueryRunner } from 'typeorm';

export class v2Profile1655210531915 implements MigrationInterface {
  name = 'v2Profile1655210531915';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "compartmentalization"`);
    await queryRunner.query(`ALTER TABLE "records" ADD "update_date" TIMESTAMP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "records" ALTER COLUMN "type" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "min_resolution"`);
    await queryRunner.query(`ALTER TABLE "records" ADD "min_resolution" real`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "max_resolution"`);
    await queryRunner.query(`ALTER TABLE "records" ADD "max_resolution" real`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "nominal_resolution"`);
    await queryRunner.query(`ALTER TABLE "records" ADD "nominal_resolution" real`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "horizontal_accuracy_ce_90"`);
    await queryRunner.query(`ALTER TABLE "records" ADD "horizontal_accuracy_ce_90" real NOT NULL`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "accuracy_le_90"`);
    await queryRunner.query(`ALTER TABLE "records" ADD "accuracy_le_90" real NOT NULL`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "accuracy_se_90"`);
    await queryRunner.query(`ALTER TABLE "records" ADD "accuracy_se_90" real`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "relative_accuracy_le_90"`);
    await queryRunner.query(`ALTER TABLE "records" ADD "relative_accuracy_le_90" real`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "visual_accuracy"`);
    await queryRunner.query(`ALTER TABLE "records" ADD "visual_accuracy" real`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "footprint"`);
    await queryRunner.query(`ALTER TABLE "records" ADD "footprint" text NOT NULL`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "height_range_from"`);
    await queryRunner.query(`ALTER TABLE "records" ADD "height_range_from" real`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "height_range_to"`);
    await queryRunner.query(`ALTER TABLE "records" ADD "height_range_to" real`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "srs"`);
    await queryRunner.query(`ALTER TABLE "records" ADD "srs" text NOT NULL DEFAULT '4326'`);
    await queryRunner.query(`ALTER TABLE "records" ALTER COLUMN "srs_name" SET DEFAULT 'WGS84GEO'`);
    await queryRunner.query(`ALTER TABLE "records" ALTER COLUMN "producer_name" SET DEFAULT 'IDFMU'`);
    await queryRunner.query(`ALTER TABLE "records" ALTER COLUMN "production_method" SET DEFAULT 'photogrammetric'`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "min_flight_alt"`);
    await queryRunner.query(`ALTER TABLE "records" ADD "min_flight_alt" real`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "max_flight_alt"`);
    await queryRunner.query(`ALTER TABLE "records" ADD "max_flight_alt" real`);
    await queryRunner.query(`ALTER TABLE "records" ALTER COLUMN "product_bbox" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "records" DROP CONSTRAINT "PK_188149422ee2454660abf1d5ee5"`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "identifier"`);
    await queryRunner.query(`ALTER TABLE "records" ADD "identifier" text NOT NULL`);
    await queryRunner.query(`ALTER TABLE "records" ADD CONSTRAINT "PK_2853dfd49850d5f439dfc462cd0" PRIMARY KEY ("identifier")`);
    await queryRunner.query(`ALTER TABLE "records" ALTER COLUMN "wkt_geometry" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "records" ALTER COLUMN "links" DROP NOT NULL`);
    await queryRunner.query(`
            CREATE FUNCTION records_update_anytext() RETURNS trigger
                SET search_path FROM CURRENT
                LANGUAGE plpgsql
                AS $$
            BEGIN   
            IF TG_OP = 'INSERT' THEN
                NEW.anytext := CONCAT (
                NEW.product_name,' ',
                NEW.product_version, ' ',
                NEW.product_type, ' ',
                NEW.description, ' ',
                NEW.sensor_type, ' ',
                NEW.srs_name, ' ',
                NEW.region, ' ',
                NEW.classification, ' ',
                NEW.keywords);
            ELSIF TG_OP = 'UPDATE' THEN
                NEW.anytext := CONCAT (
                COALESCE(NEW.product_name, OLD.product_name),' ',
                COALESCE(NEW.product_version, OLD.product_version), ' ',
                COALESCE(NEW.product_type, OLD.product_type), ' ',
                COALESCE(NEW.description, OLD.description), ' ',
                COALESCE(NEW.sensor_type, OLD.sensor_type), ' ',
                COALESCE(NEW.srs_name, OLD.srs_name), ' ',
                COALESCE(NEW.region, OLD.region), ' ',
                COALESCE(NEW.classification, OLD.classification), ' ',
                COALESCE(NEW.keywords, OLD.keywords));
            END IF;
            NEW.anytext_tsvector = to_tsvector('pg_catalog.english', NEW.anytext);
            RETURN NEW;
            END;
            $$;`);
    await queryRunner.query(`
            CREATE TRIGGER ftsupdate
                BEFORE INSERT OR UPDATE
                ON records
                FOR EACH ROW
                WHEN (NEW.product_name IS NOT NULL 
                OR NEW.product_version IS NOT NULL
                OR NEW.product_type IS NOT NULL
                OR NEW.description IS NOT NULL
                OR NEW.sensor_type IS NOT NULL
                OR NEW.srs_name IS NOT NULL
                OR NEW.region IS NOT NULL
                OR NEW.classification IS NOT NULL
                OR NEW.keywords IS NOT NULL)
                EXECUTE PROCEDURE records_update_anytext();`);

    await queryRunner.query(`
            CREATE FUNCTION records_update_geometry() RETURNS trigger
                SET search_path FROM CURRENT
                LANGUAGE plpgsql
                AS $$
            BEGIN
            IF NEW.wkt_geometry IS NULL THEN
                    RETURN NEW;
            END IF;
            NEW.wkb_geometry := ST_GeomFromText(NEW.wkt_geometry,4326);
            RETURN NEW;
            END;
            $$;`);

    await queryRunner.query(`
            CREATE TRIGGER records_update_geometry
                BEFORE INSERT OR UPDATE
                ON records
                FOR EACH ROW
                EXECUTE PROCEDURE records_update_geometry();`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "records" ALTER COLUMN "links" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "records" ALTER COLUMN "wkt_geometry" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "records" DROP CONSTRAINT "PK_2853dfd49850d5f439dfc462cd0"`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "identifier"`);
    await queryRunner.query(`ALTER TABLE "records" ADD "identifier" character varying NOT NULL`);
    await queryRunner.query(`ALTER TABLE "records" ADD CONSTRAINT "PK_188149422ee2454660abf1d5ee5" PRIMARY KEY ("identifier")`);
    await queryRunner.query(`ALTER TABLE "records" ALTER COLUMN "product_bbox" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "max_flight_alt"`);
    await queryRunner.query(`ALTER TABLE "records" ADD "max_flight_alt" numeric`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "min_flight_alt"`);
    await queryRunner.query(`ALTER TABLE "records" ADD "min_flight_alt" numeric`);
    await queryRunner.query(`ALTER TABLE "records" ALTER COLUMN "production_method" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "records" ALTER COLUMN "producer_name" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "records" ALTER COLUMN "srs_name" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "srs"`);
    await queryRunner.query(`ALTER TABLE "records" ADD "srs" integer`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "height_range_to"`);
    await queryRunner.query(`ALTER TABLE "records" ADD "height_range_to" numeric`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "height_range_from"`);
    await queryRunner.query(`ALTER TABLE "records" ADD "height_range_from" numeric`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "footprint"`);
    await queryRunner.query(`ALTER TABLE "records" ADD "footprint" geometry(GEOMETRY,0) NOT NULL`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "visual_accuracy"`);
    await queryRunner.query(`ALTER TABLE "records" ADD "visual_accuracy" numeric`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "relative_accuracy_le_90"`);
    await queryRunner.query(`ALTER TABLE "records" ADD "relative_accuracy_le_90" numeric`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "accuracy_se_90"`);
    await queryRunner.query(`ALTER TABLE "records" ADD "accuracy_se_90" numeric`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "accuracy_le_90"`);
    await queryRunner.query(`ALTER TABLE "records" ADD "accuracy_le_90" numeric NOT NULL`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "horizontal_accuracy_ce_90"`);
    await queryRunner.query(`ALTER TABLE "records" ADD "horizontal_accuracy_ce_90" numeric NOT NULL`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "nominal_resolution"`);
    await queryRunner.query(`ALTER TABLE "records" ADD "nominal_resolution" numeric`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "max_resolution"`);
    await queryRunner.query(`ALTER TABLE "records" ADD "max_resolution" numeric`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "min_resolution"`);
    await queryRunner.query(`ALTER TABLE "records" ADD "min_resolution" numeric`);
    await queryRunner.query(`ALTER TABLE "records" ALTER COLUMN "type" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "update_date"`);
    await queryRunner.query(`ALTER TABLE "records" ADD "compartmentalization" text`);
    await queryRunner.query(`DROP TRIGGER ftsupdate ON RECORDS`);
    await queryRunner.query(`DROP FUNCTION records_update_anytext`);
    await queryRunner.query(`DROP TRIGGER records_update_geometry ON RECORDS`);
    await queryRunner.query(`DROP FUNCTION records_update_geometry`);
  }
}
