-- 1. Add role column to profiles
ALTER TABLE public.profiles
ADD COLUMN role text DEFAULT 'user' NOT NULL CHECK (role IN ('user', 'admin'));

-- 2. Create is_admin function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- 3. Prevent users from escalating their own role
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If the role is being changed, and the user performing the action is not an admin
  IF OLD.role IS DISTINCT FROM NEW.role AND NOT public.is_admin() THEN
    -- If it's a superuser/service_role (auth.uid() is null), let it pass
    IF auth.uid() IS NOT NULL THEN
      RAISE EXCEPTION 'Not authorized to change role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_role_escalation_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_role_escalation();

-- 4. Admins have full access to profiles
CREATE POLICY "Admins have full access to profiles" ON public.profiles FOR ALL USING (public.is_admin());

-- 5. Admins can view all projects and documents (Audit View)
CREATE POLICY "Admins can view all projects" ON public.projects FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can view all project_documents" ON public.project_documents FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can view all requirement_docs" ON public.requirement_docs FOR SELECT USING (public.is_admin());
