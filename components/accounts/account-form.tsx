"use client";

import { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import { InputField, SelectField, TextareaField } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { Account, FamilyMember } from "@/lib/types/database";

interface AccountFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  members: FamilyMember[];
  account?: Account | null;
  defaultMemberId?: string;
}

type AccountType = "retirement" | "non-retirement" | "tax-free" | "property";

const accountTypeOptions = [
  { value: "retirement", label: "Retirement" },
  { value: "non-retirement", label: "Non-Retirement" },
  { value: "tax-free", label: "Tax-Free" },
  { value: "property", label: "Property" },
];

function getMemberAge(member: FamilyMember | undefined) {
  if (!member?.date_of_birth) return null;
  const birthYear = new Date(member.date_of_birth).getFullYear();
  return { name: member.first_name, birthYear, currentAge: new Date().getFullYear() - birthYear };
}

export function AccountForm({ open, onClose, onSaved, members, account, defaultMemberId }: AccountFormProps) {
  const isEdit = !!account;
  const [memberId, setMemberId] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("non-retirement");
  const [currentValue, setCurrentValue] = useState("0");
  const [monthlyContribution, setMonthlyContribution] = useState("0");
  const [expectedReturn, setExpectedReturn] = useState("8.00");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [isJoint, setIsJoint] = useState(false);

  // Property-specific fields
  const [rentalIncome, setRentalIncome] = useState("");
  const [rentalStartAge, setRentalStartAge] = useState("");
  const [rentalEndAge, setRentalEndAge] = useState("");
  const [plannedSaleAge, setPlannedSaleAge] = useState("");
  const [saleInclusionPct, setSaleInclusionPct] = useState("100");

  const isProperty = accountType === "property";

  // Age info based on selected member
  const memberInfo = useMemo(
    () => getMemberAge(members.find((m) => m.id === memberId)),
    [members, memberId],
  );

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      const selectedId = account?.member_id || defaultMemberId || members[0]?.id || "";
      setMemberId(selectedId);
      setAccountName(account?.account_name || "");
      setAccountType(account?.account_type || "non-retirement");
      setCurrentValue(String(account?.current_value ?? "0"));
      setMonthlyContribution(String(account?.monthly_contribution ?? "0"));
      setExpectedReturn(String(account?.expected_return_pct ?? "8.00"));
      setNotes(account?.notes || "");
      setIsJoint(account?.is_joint ?? false);

      // Property fields
      setRentalIncome(account?.rental_income_monthly ? String(account.rental_income_monthly) : "");
      setSaleInclusionPct(String(account?.sale_inclusion_pct ?? "100"));

      // Convert years to ages using the selected member's birth year
      const info = getMemberAge(members.find((m) => m.id === selectedId));
      if (info) {
        setRentalStartAge(account?.rental_start_year ? String(account.rental_start_year - info.birthYear) : "");
        setRentalEndAge(account?.rental_end_year ? String(account.rental_end_year - info.birthYear) : "");
        setPlannedSaleAge(account?.planned_sale_year ? String(account.planned_sale_year - info.birthYear) : "");
      } else {
        setRentalStartAge(account?.rental_start_year ? String(account.rental_start_year) : "");
        setRentalEndAge(account?.rental_end_year ? String(account.rental_end_year) : "");
        setPlannedSaleAge(account?.planned_sale_year ? String(account.planned_sale_year) : "");
      }
    }
  }, [open, account, defaultMemberId, members]);

  const memberOptions = members.map((m) => ({
    value: m.id,
    label: `${m.first_name} ${m.last_name}`,
  }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountName.trim() || !memberId) return;

    setSaving(true);
    const supabase = createClient();

    // Convert ages to years
    let rentalStartYear: number | null = null;
    let rentalEndYear: number | null = null;
    let plannedSaleYear: number | null = null;

    if (isProperty && memberInfo) {
      rentalStartYear = rentalStartAge ? memberInfo.birthYear + parseInt(rentalStartAge) : null;
      rentalEndYear = rentalEndAge ? memberInfo.birthYear + parseInt(rentalEndAge) : null;
      plannedSaleYear = plannedSaleAge ? memberInfo.birthYear + parseInt(plannedSaleAge) : null;
    } else if (isProperty) {
      rentalStartYear = rentalStartAge ? parseInt(rentalStartAge) : null;
      rentalEndYear = rentalEndAge ? parseInt(rentalEndAge) : null;
      plannedSaleYear = plannedSaleAge ? parseInt(plannedSaleAge) : null;
    }

    const payload = {
      member_id: memberId,
      account_name: accountName.trim(),
      account_type: accountType,
      current_value: parseFloat(currentValue) ?? 0,
      monthly_contribution: isProperty ? 0 : (parseFloat(monthlyContribution) ?? 0),
      expected_return_pct: isNaN(parseFloat(expectedReturn)) ? (isProperty ? 5.0 : 8.0) : parseFloat(expectedReturn),
      fee_pct: 0,
      notes: notes.trim() || null,
      is_joint: members.length > 1 ? isJoint : false,
      rental_income_monthly: isProperty && rentalIncome ? parseFloat(rentalIncome) : null,
      rental_start_year: isProperty ? rentalStartYear : null,
      rental_end_year: isProperty ? rentalEndYear : null,
      planned_sale_year: isProperty ? plannedSaleYear : null,
      sale_inclusion_pct: isProperty ? (parseFloat(saleInclusionPct) || 100) : null,
    };

    if (isEdit && account) {
      await supabase.from("accounts").update(payload).eq("id", account.id);
    } else {
      await supabase.from("accounts").insert(payload);
    }

    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Account" : "Add Account"}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {members.length > 1 && (
          <SelectField
            label="Family Member"
            id="account-member"
            options={memberOptions}
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
          />
        )}
        <InputField
          label="Account Name"
          id="account-name"
          placeholder={isProperty ? "e.g. 12 Beach Road, Camps Bay" : "e.g. Allan Gray RA"}
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          required
        />
        <SelectField
          label="Account Type"
          id="account-type"
          options={accountTypeOptions}
          value={accountType}
          onChange={(e) => setAccountType(e.target.value as AccountType)}
        />
        {members.length > 1 && (
          <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--gray-600)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={isJoint}
              onChange={(e) => setIsJoint(e.target.checked)}
            />
            Joint account (income split between partners)
          </label>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
          <CurrencyInput
            label={isProperty ? "Current Valuation (R)" : "Current Value (R)"}
            id="account-value"
            value={currentValue}
            onChange={setCurrentValue}
          />
          {!isProperty && (
            <CurrencyInput
              label="Monthly Contribution (R)"
              id="account-contribution"
              value={monthlyContribution}
              onChange={setMonthlyContribution}
            />
          )}
        </div>
        <InputField
          label={isProperty ? "Appreciation Rate % (Annual)" : "Expected Return % (After all fees)"}
          id="account-return"
          type="number"
          step="0.01"
          min="0"
          max="50"
          value={expectedReturn}
          onChange={(e) => setExpectedReturn(e.target.value)}
        />

        {/* Property-specific fields */}
        {isProperty && (
          <>
            <div style={{ borderTop: "1px solid var(--border-default)", paddingTop: "var(--space-4)" }}>
              <p style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--gray-700)", margin: "0 0 var(--space-3) 0" }}>
                Rental Income
              </p>
              <CurrencyInput
                label="Monthly Rental Income (R)"
                id="property-rental"
                value={rentalIncome}
                onChange={setRentalIncome}
              />
              {memberInfo && (
                <p style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)", margin: "var(--space-2) 0 0 0" }}>
                  {memberInfo.name} is currently {memberInfo.currentAge} years old
                </p>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", marginTop: "var(--space-3)" }}>
                <InputField
                  label={memberInfo ? `Rental Start Age (${memberInfo.name})` : "Rental Start Year"}
                  id="property-rental-start"
                  type="number"
                  min={memberInfo ? "0" : "2000"}
                  max={memberInfo ? "120" : "2100"}
                  placeholder={memberInfo ? `e.g. ${memberInfo.currentAge}` : "Optional"}
                  value={rentalStartAge}
                  onChange={(e) => setRentalStartAge(e.target.value)}
                />
                <InputField
                  label={memberInfo ? `Rental End Age (${memberInfo.name})` : "Rental End Year"}
                  id="property-rental-end"
                  type="number"
                  min={memberInfo ? "0" : "2000"}
                  max={memberInfo ? "120" : "2100"}
                  placeholder="Optional"
                  value={rentalEndAge}
                  onChange={(e) => setRentalEndAge(e.target.value)}
                />
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--border-default)", paddingTop: "var(--space-4)" }}>
              <p style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--gray-700)", margin: "0 0 var(--space-3) 0" }}>
                Planned Sale
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                <InputField
                  label={memberInfo ? `Sale Age (${memberInfo.name})` : "Sale Year"}
                  id="property-sale-age"
                  type="number"
                  min={memberInfo ? "0" : "2000"}
                  max={memberInfo ? "120" : "2100"}
                  placeholder="Optional"
                  value={plannedSaleAge}
                  onChange={(e) => setPlannedSaleAge(e.target.value)}
                />
                <InputField
                  label="% of Sale Proceeds into Plan"
                  id="property-sale-pct"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={saleInclusionPct}
                  onChange={(e) => setSaleInclusionPct(e.target.value)}
                />
              </div>
            </div>
          </>
        )}

        <TextareaField
          label="Notes"
          id="account-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" loading={saving}>
            {isEdit ? "Save Changes" : "Add Account"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
