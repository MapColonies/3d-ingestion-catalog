import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductSubType166261781622428002 implements MigrationInterface {
  name = 'AddProductSubType166261781622428002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "records" ADD "product_sub_type" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "records" DROP COLUMN "product_sub_type"`);
  }
}
