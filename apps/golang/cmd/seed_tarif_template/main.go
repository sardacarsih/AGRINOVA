package main

import (
	"log"

	"agrinovagraphql/server/pkg/config"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	db, err := gorm.Open(postgres.Open(cfg.Database.DSN()), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	log.Println("Seeding tarif template TYPE_1 / TYPE_2 ...")

	if err := db.Transaction(func(tx *gorm.DB) error {
		if err := seedLandTypes(tx); err != nil {
			return err
		}
		if err := seedTariffSchemesAndRules(tx); err != nil {
			return err
		}
		if err := seedNormalOverrides(tx); err != nil {
			return err
		}
		return nil
	}); err != nil {
		log.Fatalf("failed to seed tarif template: %v", err)
	}

	var totalCompanies int64
	if err := db.Table("companies").Count(&totalCompanies).Error; err != nil {
		log.Fatalf("failed to count companies: %v", err)
	}

	var totalRules int64
	if err := db.Table("tariff_scheme_rules").Count(&totalRules).Error; err != nil {
		log.Fatalf("failed to count tariff rules: %v", err)
	}

	log.Printf("Tarif template seeding completed. companies=%d total_rules=%d", totalCompanies, totalRules)
}

func seedLandTypes(tx *gorm.DB) error {
	return tx.Exec(`
		INSERT INTO land_types (code, name, description, is_active, created_at, updated_at)
		VALUES
			('TYPE_1', 'Daratan, Rata, Bergelombang', 'Kelompok tipe lahan: Daratan, Rata, Bergelombang', TRUE, NOW(), NOW()),
			('TYPE_2', 'Berbukit, Rendahan, Gambut', 'Kelompok tipe lahan: Berbukit, Rendahan, Gambut', TRUE, NOW(), NOW())
		ON CONFLICT (code) DO UPDATE
		SET
			name = EXCLUDED.name,
			description = EXCLUDED.description,
			is_active = TRUE,
			updated_at = NOW();
	`).Error
}

func seedTariffSchemesAndRules(tx *gorm.DB) error {
	if err := tx.Exec(`
		WITH template(land_type_code, scheme_code, scheme_name) AS (
			VALUES
				('TYPE_1', 'TYPE_1', 'TYPE 1'),
				('TYPE_2', 'TYPE_2', 'TYPE 2')
		),
		target AS (
			SELECT DISTINCT
				c.id AS company_id,
				lt.id AS land_type_id,
				t.scheme_code,
				t.scheme_name
			FROM companies c
			CROSS JOIN template t
			JOIN land_types lt ON lt.code = t.land_type_code
		)
		UPDATE tariff_schemes ts
		SET
			scheme_name = target.scheme_name,
			is_active = TRUE,
			updated_at = NOW()
		FROM target
		WHERE ts.company_id = target.company_id
		  AND COALESCE(ts.land_type_id, '00000000-0000-0000-0000-000000000000'::uuid)
		      = COALESCE(target.land_type_id, '00000000-0000-0000-0000-000000000000'::uuid)
		  AND LOWER(TRIM(ts.scheme_code)) = LOWER(TRIM(target.scheme_code));
	`).Error; err != nil {
		return err
	}

	if err := tx.Exec(`
		WITH template(land_type_code, scheme_code, scheme_name) AS (
			VALUES
				('TYPE_1', 'TYPE_1', 'TYPE 1'),
				('TYPE_2', 'TYPE_2', 'TYPE 2')
		),
		target AS (
			SELECT DISTINCT
				c.id AS company_id,
				lt.id AS land_type_id,
				t.scheme_code,
				t.scheme_name
			FROM companies c
			CROSS JOIN template t
			JOIN land_types lt ON lt.code = t.land_type_code
		)
		INSERT INTO tariff_schemes (
			id,
			company_id,
			land_type_id,
			scheme_code,
			scheme_name,
			description,
			is_active,
			created_at,
			updated_at
		)
		SELECT
			gen_random_uuid(),
			target.company_id,
			target.land_type_id,
			target.scheme_code,
			target.scheme_name,
			'Seeded from TYPE_1/TYPE_2 BJR template',
			TRUE,
			NOW(),
			NOW()
		FROM target
		WHERE NOT EXISTS (
			SELECT 1
			FROM tariff_schemes ts
			WHERE ts.company_id = target.company_id
			  AND COALESCE(ts.land_type_id, '00000000-0000-0000-0000-000000000000'::uuid)
			      = COALESCE(target.land_type_id, '00000000-0000-0000-0000-000000000000'::uuid)
			  AND LOWER(TRIM(ts.scheme_code)) = LOWER(TRIM(target.scheme_code))
		);
	`).Error; err != nil {
		return err
	}

	if err := tx.Exec(`
		WITH template(
			land_type_code,
			scheme_code,
			tarif_code,
			bjr_min_kg,
			bjr_max_kg,
			basis,
			tarif_upah,
			premi,
			tarif_premi1,
			sort_order,
			perlakuan,
			keterangan
		) AS (
			VALUES
				('TYPE_1', 'TYPE_1', 'BJR20', 20::numeric, NULL::numeric, 1000::numeric, 160::numeric, 5000::numeric, 175::numeric, 1, 'BJR20 - TYPE 1', '-'),
				('TYPE_1', 'TYPE_1', 'BJR16', 16::numeric, 20::numeric, 1100::numeric, 130::numeric, 5000::numeric, 160::numeric, 2, 'BJR16 - TYPE 1', '-'),
				('TYPE_1', 'TYPE_1', 'BJR13', 13::numeric, 16::numeric, 1150::numeric, 125::numeric, 5000::numeric, 153::numeric, 3, 'BJR13 - TYPE 1', '-'),
				('TYPE_1', 'TYPE_1', 'BJR10', 10::numeric, 13::numeric, 1100::numeric, 127::numeric, 5000::numeric, 155::numeric, 4, 'BJR10 - TYPE 1', '-'),
				('TYPE_1', 'TYPE_1', 'BJR07', 7::numeric, 10::numeric, 950::numeric, 150::numeric, 5000::numeric, 198::numeric, 5, 'BJR07 - TYPE 1', '-'),
				('TYPE_1', 'TYPE_1', 'BJR04', 4::numeric, 7::numeric, 750::numeric, 195::numeric, 5000::numeric, 245::numeric, 6, 'BJR04 - TYPE 1', '-'),
				('TYPE_1', 'TYPE_1', 'BJR03', NULL::numeric, 4::numeric, 500::numeric, 290::numeric, 5000::numeric, 325::numeric, 7, 'BJR03 - TYPE 1', '-'),
				('TYPE_2', 'TYPE_2', 'BJR20', 20::numeric, NULL::numeric, 1000::numeric, 162::numeric, 5000::numeric, 177::numeric, 1, 'BJR20 - TYPE 2', '-'),
				('TYPE_2', 'TYPE_2', 'BJR16', 16::numeric, 20::numeric, 1100::numeric, 132::numeric, 5000::numeric, 162::numeric, 2, 'BJR16 - TYPE 2', '-'),
				('TYPE_2', 'TYPE_2', 'BJR13', 13::numeric, 16::numeric, 1150::numeric, 127::numeric, 5000::numeric, 155::numeric, 3, 'BJR13 - TYPE 2', '-'),
				('TYPE_2', 'TYPE_2', 'BJR10', 10::numeric, 13::numeric, 1100::numeric, 129::numeric, 5000::numeric, 157::numeric, 4, 'BJR10 - TYPE 2', '-'),
				('TYPE_2', 'TYPE_2', 'BJR07', 7::numeric, 10::numeric, 950::numeric, 152::numeric, 5000::numeric, 200::numeric, 5, 'BJR07 - TYPE 2', '-'),
				('TYPE_2', 'TYPE_2', 'BJR04', 4::numeric, 7::numeric, 750::numeric, 197::numeric, 5000::numeric, 247::numeric, 6, 'BJR04 - TYPE 2', '-'),
				('TYPE_2', 'TYPE_2', 'BJR03', NULL::numeric, 4::numeric, 500::numeric, 292::numeric, 5000::numeric, 327::numeric, 7, 'BJR03 - TYPE 2', '-')
		),
		target AS (
			SELECT
				c.id AS company_id,
				tariff_template.*,
				ts.id AS scheme_id
			FROM companies c
			CROSS JOIN template tariff_template
			JOIN land_types lt ON lt.code = tariff_template.land_type_code
			JOIN tariff_schemes ts
			  ON ts.company_id = c.id
			 AND COALESCE(ts.land_type_id, '00000000-0000-0000-0000-000000000000'::uuid)
			     = COALESCE(lt.id, '00000000-0000-0000-0000-000000000000'::uuid)
			 AND LOWER(TRIM(ts.scheme_code)) = LOWER(TRIM(tariff_template.scheme_code))
		)
		UPDATE tariff_scheme_rules r
		SET
			perlakuan = target.perlakuan,
			keterangan = target.keterangan,
			bjr_min_kg = target.bjr_min_kg,
			bjr_max_kg = target.bjr_max_kg,
			basis = target.basis,
			tarif_upah = target.tarif_upah,
			premi = target.premi,
			target_lebih_kg = target.basis,
			tarif_premi1 = target.tarif_premi1,
			tarif_premi2 = NULL,
			sort_order = target.sort_order,
			is_active = TRUE,
			updated_at = NOW()
		FROM target
		WHERE r.scheme_id = target.scheme_id
		  AND LOWER(TRIM(r.tarif_code)) = LOWER(TRIM(target.tarif_code));
	`).Error; err != nil {
		return err
	}

	return tx.Exec(`
		WITH template(
			land_type_code,
			scheme_code,
			tarif_code,
			bjr_min_kg,
			bjr_max_kg,
			basis,
			tarif_upah,
			premi,
			tarif_premi1,
			sort_order,
			perlakuan,
			keterangan
		) AS (
			VALUES
				('TYPE_1', 'TYPE_1', 'BJR20', 20::numeric, NULL::numeric, 1000::numeric, 160::numeric, 5000::numeric, 175::numeric, 1, 'BJR20 - TYPE 1', '-'),
				('TYPE_1', 'TYPE_1', 'BJR16', 16::numeric, 20::numeric, 1100::numeric, 130::numeric, 5000::numeric, 160::numeric, 2, 'BJR16 - TYPE 1', '-'),
				('TYPE_1', 'TYPE_1', 'BJR13', 13::numeric, 16::numeric, 1150::numeric, 125::numeric, 5000::numeric, 153::numeric, 3, 'BJR13 - TYPE 1', '-'),
				('TYPE_1', 'TYPE_1', 'BJR10', 10::numeric, 13::numeric, 1100::numeric, 127::numeric, 5000::numeric, 155::numeric, 4, 'BJR10 - TYPE 1', '-'),
				('TYPE_1', 'TYPE_1', 'BJR07', 7::numeric, 10::numeric, 950::numeric, 150::numeric, 5000::numeric, 198::numeric, 5, 'BJR07 - TYPE 1', '-'),
				('TYPE_1', 'TYPE_1', 'BJR04', 4::numeric, 7::numeric, 750::numeric, 195::numeric, 5000::numeric, 245::numeric, 6, 'BJR04 - TYPE 1', '-'),
				('TYPE_1', 'TYPE_1', 'BJR03', NULL::numeric, 4::numeric, 500::numeric, 290::numeric, 5000::numeric, 325::numeric, 7, 'BJR03 - TYPE 1', '-'),
				('TYPE_2', 'TYPE_2', 'BJR20', 20::numeric, NULL::numeric, 1000::numeric, 162::numeric, 5000::numeric, 177::numeric, 1, 'BJR20 - TYPE 2', '-'),
				('TYPE_2', 'TYPE_2', 'BJR16', 16::numeric, 20::numeric, 1100::numeric, 132::numeric, 5000::numeric, 162::numeric, 2, 'BJR16 - TYPE 2', '-'),
				('TYPE_2', 'TYPE_2', 'BJR13', 13::numeric, 16::numeric, 1150::numeric, 127::numeric, 5000::numeric, 155::numeric, 3, 'BJR13 - TYPE 2', '-'),
				('TYPE_2', 'TYPE_2', 'BJR10', 10::numeric, 13::numeric, 1100::numeric, 129::numeric, 5000::numeric, 157::numeric, 4, 'BJR10 - TYPE 2', '-'),
				('TYPE_2', 'TYPE_2', 'BJR07', 7::numeric, 10::numeric, 950::numeric, 152::numeric, 5000::numeric, 200::numeric, 5, 'BJR07 - TYPE 2', '-'),
				('TYPE_2', 'TYPE_2', 'BJR04', 4::numeric, 7::numeric, 750::numeric, 197::numeric, 5000::numeric, 247::numeric, 6, 'BJR04 - TYPE 2', '-'),
				('TYPE_2', 'TYPE_2', 'BJR03', NULL::numeric, 4::numeric, 500::numeric, 292::numeric, 5000::numeric, 327::numeric, 7, 'BJR03 - TYPE 2', '-')
		),
		target AS (
			SELECT
				c.id AS company_id,
				tariff_template.*,
				ts.id AS scheme_id
			FROM companies c
			CROSS JOIN template tariff_template
			JOIN land_types lt ON lt.code = tariff_template.land_type_code
			JOIN tariff_schemes ts
			  ON ts.company_id = c.id
			 AND COALESCE(ts.land_type_id, '00000000-0000-0000-0000-000000000000'::uuid)
			     = COALESCE(lt.id, '00000000-0000-0000-0000-000000000000'::uuid)
			 AND LOWER(TRIM(ts.scheme_code)) = LOWER(TRIM(tariff_template.scheme_code))
		)
		INSERT INTO tariff_scheme_rules (
			id,
			scheme_id,
			tarif_code,
			perlakuan,
			keterangan,
			bjr_min_kg,
			bjr_max_kg,
			basis,
			tarif_upah,
			premi,
			target_lebih_kg,
			tarif_premi1,
			tarif_premi2,
			sort_order,
			is_active,
			created_at,
			updated_at
		)
		SELECT
			gen_random_uuid(),
			target.scheme_id,
			target.tarif_code,
			target.perlakuan,
			target.keterangan,
			target.bjr_min_kg,
			target.bjr_max_kg,
			target.basis,
			target.tarif_upah,
			target.premi,
			target.basis,
			target.tarif_premi1,
			NULL::numeric,
			target.sort_order,
			TRUE,
			NOW(),
			NOW()
		FROM target
		WHERE NOT EXISTS (
			SELECT 1
			FROM tariff_scheme_rules r
			WHERE r.scheme_id = target.scheme_id
			  AND LOWER(TRIM(r.tarif_code)) = LOWER(TRIM(target.tarif_code))
		);
	`).Error
}

func seedNormalOverrides(tx *gorm.DB) error {
	if err := tx.Exec(`
		WITH template(land_type_code, scheme_code, tarif_code, tarif_upah, premi, tarif_premi1) AS (
			VALUES
				('TYPE_1', 'TYPE_1', 'BJR20', 160::numeric, 5000::numeric, 175::numeric),
				('TYPE_1', 'TYPE_1', 'BJR16', 130::numeric, 5000::numeric, 160::numeric),
				('TYPE_1', 'TYPE_1', 'BJR13', 125::numeric, 5000::numeric, 153::numeric),
				('TYPE_1', 'TYPE_1', 'BJR10', 127::numeric, 5000::numeric, 155::numeric),
				('TYPE_1', 'TYPE_1', 'BJR07', 150::numeric, 5000::numeric, 198::numeric),
				('TYPE_1', 'TYPE_1', 'BJR04', 195::numeric, 5000::numeric, 245::numeric),
				('TYPE_1', 'TYPE_1', 'BJR03', 290::numeric, 5000::numeric, 325::numeric),
				('TYPE_2', 'TYPE_2', 'BJR20', 162::numeric, 5000::numeric, 177::numeric),
				('TYPE_2', 'TYPE_2', 'BJR16', 132::numeric, 5000::numeric, 162::numeric),
				('TYPE_2', 'TYPE_2', 'BJR13', 127::numeric, 5000::numeric, 155::numeric),
				('TYPE_2', 'TYPE_2', 'BJR10', 129::numeric, 5000::numeric, 157::numeric),
				('TYPE_2', 'TYPE_2', 'BJR07', 152::numeric, 5000::numeric, 200::numeric),
				('TYPE_2', 'TYPE_2', 'BJR04', 197::numeric, 5000::numeric, 247::numeric),
				('TYPE_2', 'TYPE_2', 'BJR03', 292::numeric, 5000::numeric, 327::numeric)
		),
		target AS (
			SELECT
				r.id AS rule_id,
				template.tarif_upah,
				template.premi,
				template.tarif_premi1
			FROM companies c
			CROSS JOIN template
			JOIN land_types lt ON lt.code = template.land_type_code
			JOIN tariff_schemes ts
			  ON ts.company_id = c.id
			 AND COALESCE(ts.land_type_id, '00000000-0000-0000-0000-000000000000'::uuid)
			     = COALESCE(lt.id, '00000000-0000-0000-0000-000000000000'::uuid)
			 AND LOWER(TRIM(ts.scheme_code)) = LOWER(TRIM(template.scheme_code))
			JOIN tariff_scheme_rules r
			  ON r.scheme_id = ts.id
			 AND LOWER(TRIM(r.tarif_code)) = LOWER(TRIM(template.tarif_code))
		)
		DELETE FROM tariff_rule_overrides o
		USING target
		WHERE o.rule_id = target.rule_id
		  AND o.override_type = 'NORMAL'
		  AND o.effective_from IS NULL
		  AND o.effective_to IS NULL;
	`).Error; err != nil {
		return err
	}

	return tx.Exec(`
		WITH template(land_type_code, scheme_code, tarif_code, tarif_upah, premi, tarif_premi1) AS (
			VALUES
				('TYPE_1', 'TYPE_1', 'BJR20', 160::numeric, 5000::numeric, 175::numeric),
				('TYPE_1', 'TYPE_1', 'BJR16', 130::numeric, 5000::numeric, 160::numeric),
				('TYPE_1', 'TYPE_1', 'BJR13', 125::numeric, 5000::numeric, 153::numeric),
				('TYPE_1', 'TYPE_1', 'BJR10', 127::numeric, 5000::numeric, 155::numeric),
				('TYPE_1', 'TYPE_1', 'BJR07', 150::numeric, 5000::numeric, 198::numeric),
				('TYPE_1', 'TYPE_1', 'BJR04', 195::numeric, 5000::numeric, 245::numeric),
				('TYPE_1', 'TYPE_1', 'BJR03', 290::numeric, 5000::numeric, 325::numeric),
				('TYPE_2', 'TYPE_2', 'BJR20', 162::numeric, 5000::numeric, 177::numeric),
				('TYPE_2', 'TYPE_2', 'BJR16', 132::numeric, 5000::numeric, 162::numeric),
				('TYPE_2', 'TYPE_2', 'BJR13', 127::numeric, 5000::numeric, 155::numeric),
				('TYPE_2', 'TYPE_2', 'BJR10', 129::numeric, 5000::numeric, 157::numeric),
				('TYPE_2', 'TYPE_2', 'BJR07', 152::numeric, 5000::numeric, 200::numeric),
				('TYPE_2', 'TYPE_2', 'BJR04', 197::numeric, 5000::numeric, 247::numeric),
				('TYPE_2', 'TYPE_2', 'BJR03', 292::numeric, 5000::numeric, 327::numeric)
		),
		target AS (
			SELECT
				r.id AS rule_id,
				template.tarif_upah,
				template.premi,
				template.tarif_premi1
			FROM companies c
			CROSS JOIN template
			JOIN land_types lt ON lt.code = template.land_type_code
			JOIN tariff_schemes ts
			  ON ts.company_id = c.id
			 AND COALESCE(ts.land_type_id, '00000000-0000-0000-0000-000000000000'::uuid)
			     = COALESCE(lt.id, '00000000-0000-0000-0000-000000000000'::uuid)
			 AND LOWER(TRIM(ts.scheme_code)) = LOWER(TRIM(template.scheme_code))
			JOIN tariff_scheme_rules r
			  ON r.scheme_id = ts.id
			 AND LOWER(TRIM(r.tarif_code)) = LOWER(TRIM(template.tarif_code))
		)
		INSERT INTO tariff_rule_overrides (
			id,
			rule_id,
			override_type,
			effective_from,
			effective_to,
			tarif_upah,
			premi,
			tarif_premi1,
			tarif_premi2,
			notes,
			is_active,
			created_at,
			updated_at
		)
		SELECT
			gen_random_uuid(),
			target.rule_id,
			'NORMAL',
			NULL,
			NULL,
			target.tarif_upah,
			target.premi,
			target.tarif_premi1,
			NULL::numeric,
			'Seeded default NORMAL override from TYPE_1/TYPE_2 template',
			TRUE,
			NOW(),
			NOW()
		FROM target;
	`).Error
}
