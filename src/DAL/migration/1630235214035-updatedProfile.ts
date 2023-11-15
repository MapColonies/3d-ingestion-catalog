import { MigrationInterface, QueryRunner } from 'typeorm';

export class updatedProfile1630235214035 implements MigrationInterface {
  name = 'updatedProfile1630235214035';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "records" (
        "identifier" character varying NOT NULL,
       "product_id" text NOT NULL, 
       "product_name" text NOT NULL, 
       "product_version" integer NOT NULL, 
       "product_type" text NOT NULL, 
       "description" text, 
       "creation_date" TIMESTAMP, 
       "source_start_date" TIMESTAMP NOT NULL, 
       "source_end_date" TIMESTAMP NOT NULL, 
       "min_resolution" numeric, 
       "max_resolution" numeric, 
       "nominal_resolution" numeric, 
       "horizontal_accuracy_ce_90" numeric NOT NULL, 
       "accuracy_le_90" numeric NOT NULL, 
       "accuracy_se_90" numeric, 
       "relative_accuracy_le_90" numeric, 
       "visual_accuracy" numeric, 
       "sensor_type" text NOT NULL, 
       "footprint" geometry NOT NULL, 
       "height_range_from" numeric, 
       "height_range_to" numeric, 
       "srs" integer, 
       "srs_name" text NOT NULL, 
       "srs_origin" text, 
       "region" text NOT NULL, 
       "classification" text NOT NULL, 
       "compartmentalization" text, 
       "production_system" text NOT NULL, 
       "production_system_version" text NOT NULL, 
       "producer_name" text NOT NULL, 
       "production_method" text, 
       "min_flight_alt" numeric, 
       "max_flight_alt" numeric, 
       "geographic_area" text, 
       "product_bbox" text NOT NULL, 
       "links" text NOT NULL, 
       "type" text NOT NULL, 
       "typename" text NOT NULL, 
       "schema" text NOT NULL, 
       "mdsource" text NOT NULL, 
       "xml" text NOT NULL, 
       "anytext" text NOT NULL, 
       "insert_date" TIMESTAMP NOT NULL, 
       "wkt_geometry" text NOT NULL, 
       "wkb_geometry" geometry(Geometry,4326), 
       "keywords" text NOT NULL, 
       "anytext_tsvector" tsvector, 
       CONSTRAINT "PK_188149422ee2454660abf1d5ee5" PRIMARY KEY ("identifier"))`
    );
    await queryRunner.query(`CREATE INDEX "records_fts_gin_idx" ON "records" ("anytext_tsvector") `);
    await queryRunner.query(`CREATE INDEX "records_wkb_geometry_idx" ON "records" USING GiST ("wkb_geometry") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "records_wkb_geometry_idx"`);
    await queryRunner.query(`DROP INDEX "records_fts_gin_idx"`);
    await queryRunner.query(`DROP TABLE "records"`);
  }
}
