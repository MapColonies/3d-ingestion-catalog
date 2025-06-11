import { MigrationInterface, QueryRunner } from 'typeorm';

export class v2ProfileFinal1749652792376 implements MigrationInterface {
  name = 'v2ProfileFinal1749652792376';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "records" ADD CONSTRAINT "UQ_product_name" UNIQUE ("product_name")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "records" DROP CONSTRAINT "UQ_product_name"`);
  }
}
