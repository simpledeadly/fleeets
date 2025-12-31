-- 1. Функция аудита изменений элементов
CREATE OR REPLACE FUNCTION public.audit_item_changes()
RETURNS TRIGGER AS $$
DECLARE
    event_type TEXT;
    event_meta JSONB;
BEGIN
    -- Определение типа события
    IF (TG_OP = 'INSERT') THEN
        event_type := 'item.create';
        event_meta := jsonb_build_object(
            'item_id', NEW.id,
            'source', COALESCE(NEW.metadata->>'source', 'auto'),
            'item_content', NEW.content
        );
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Логируем только значимые изменения
        IF (OLD.status IS DISTINCT FROM NEW.status) THEN
            IF (OLD.status = 'inbox') THEN
                event_type := 'item.triage';
            ELSE
                event_type := 'item.status_change';
            END IF;
            
            event_meta := jsonb_build_object(
                'item_id', NEW.id,
                'from', OLD.status,
                'to', NEW.status,
                'item_content', NEW.content
            );
        -- Можно добавить логирование изменения контента, если нужно
        -- ELSIF (OLD.content IS DISTINCT FROM NEW.content) THEN
        --     event_type := 'item.update';
        --     event_meta := jsonb_build_object('item_id', NEW.id, 'fields', ARRAY['content']);
        ELSE
            -- Если статус не менялся, но это был апдейт (например, контент или логи)
            -- В оригинале было логирование всех апдейтов, но это может быть шумным.
            -- Ограничимся основными событиями для "экономности".
            RETURN NEW;
        END IF;
    END IF;

    -- Запись в лог
    INSERT INTO public.activity_logs (
        user_id,
        source,
        category,
        started_at,
        ended_at,
        details
    ) VALUES (
        NEW.user_id,
        'db_trigger',
        event_type,
        now(),
        now(),
        event_meta
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Триггер на таблицу items
DROP TRIGGER IF EXISTS tr_audit_items ON public.items;
CREATE TRIGGER tr_audit_items
AFTER INSERT OR UPDATE ON public.items
FOR EACH ROW EXECUTE FUNCTION public.audit_item_changes();

-- 3. (Опционально) Функция для автоматического завершения сессий фокуса
-- Если нужно, можно добавить триггер на activity_logs для автоматизации focus.session, 
-- но пока оставим это в коде для гибкости.
