import { MigrationInterface, QueryRunner } from 'typeorm';

export class v2ProfileFinal1658748610081 implements MigrationInterface {
  name = 'v2ProfileFinal1658748610081';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "srs_origin"`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "production_method"`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "nominal_resolution"`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "relative_accuracy_le_90"`);
    await queryRunner.query(`ALTER TABLE "records" ADD "relative_accuracy_se_90" real`);
    await queryRunner.query(`ALTER TABLE "records" ADD "product_source" text NOT NULL`);
    await queryRunner.query(`ALTER TABLE "records" ADD "product_status" text DEFAULT 'UnPublished'`);
    await queryRunner.query(`ALTER TABLE "records" ALTER COLUMN "product_bbox" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "records" ALTER COLUMN "wkt_geometry" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "records" ALTER COLUMN "links" SET NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "records" ALTER COLUMN "links" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "records" ALTER COLUMN "wkt_geometry" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "records" ALTER COLUMN "product_bbox" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "product_status"`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "product_source"`);
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "relative_accuracy_se_90"`);
    await queryRunner.query(`ALTER TABLE "records" ADD "relative_accuracy_le_90" real`);
    await queryRunner.query(`ALTER TABLE "records" ADD "nominal_resolution" real`);
    await queryRunner.query(`ALTER TABLE "records" ADD "production_method" text DEFAULT 'photogrammetric'`);
    await queryRunner.query(`ALTER TABLE "records" ADD "srs_origin" text`);
  }
}
