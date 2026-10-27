do $migration$
declare
  v_definition text;
begin
  v_definition := pg_get_functiondef(
    'public.create_order_with_stock(uuid, integer, jsonb, bigint, text, integer, text)'::regprocedure
  );
  if position('for update of pv;' in lower(v_definition)) = 0 then
    raise exception 'Expected checkout variant lock clause was not found';
  end if;
  v_definition := replace(
    v_definition,
    'for update of pv;',
    'for update of pv for share of p;'
  );
  execute v_definition;
end;
$migration$;
