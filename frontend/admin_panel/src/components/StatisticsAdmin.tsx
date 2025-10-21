import { useEffect, useMemo, useState } from "react";
import { Box, Button, CircularProgress, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import axios from "axios";

// Для .env или напрямую укажи адрес своего API:
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const ACTIONS = [
    { key: "enter_bot", label: "Перешли в бот" },
    { key: "submit_phone", label: "Оставили номер" },
    { key: "open_miniapp", label: "Открыли миниэпп" },
    { key: "add_to_cart", label: "Добавили в корзину" },
    { key: "payment", label: "Произвели оплату" },
];

export default function StatisticsAdmin() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Получение данных с сервера
    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/user_actions`);
            setLogs(Array.isArray(res.data) ? res.data : []);
            setError(null);
        } catch (e) {
            setError("Ошибка загрузки статистики");
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    // Подсчёт статистики по шагам
    const stats = useMemo(() => {
        const byAction: { [key: string]: Set<number> } = {};
        ACTIONS.forEach(a => byAction[a.key] = new Set());
        logs.forEach(log => {
            if (byAction[log.action]) {
                byAction[log.action].add(log.user_id);
            }
        });
        return byAction;
    }, [logs]);

    // Для таблицы: сгруппировать по пользователям и показать их шаги
    const usersSteps = useMemo(() => {
        const users: { [userId: number]: { user_id: number; phone_number?: string; actions: Set<string> } } = {};
        logs.forEach(log => {
            if (!users[log.user_id]) {
                users[log.user_id] = { user_id: log.user_id, phone_number: log.phone_number, actions: new Set() };
            }
            users[log.user_id].actions.add(log.action);
        });
        return Object.values(users);
    }, [logs]);

    return (
        <Box sx={{ width: "100%", px: { xs: 1, sm: 2, md: 0 }, pb: 4 }}>
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 3,
                    mt: 1,
                    flexWrap: "wrap",
                    gap: 2,
                }}
            >
                <Typography
                    variant="h4"
                    sx={{
                        color: "#5485E4",
                        fontFamily: "Nunito",
                        fontWeight: 700,
                        fontSize: { xs: 26, md: 32 },
                    }}
                >
                    Статистика шагов пользователей
                </Typography>
                <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<RefreshIcon/>}
                    sx={{ borderRadius: 3, fontWeight: 700, height: 44 }}
                    onClick={fetchLogs}
                >
                    Обновить
                </Button>
            </Box>

            {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", my: 8 }}>
                    <CircularProgress/>
                </Box>
            ) : error ? (
                <Typography sx={{ color: "#D03A3A", mt: 2 }}>{error}</Typography>
            ) : (
                <>
                    {/* Статистика по шагам */}
                    <Paper sx={{ mb: 4, p: 3, boxShadow: "0 4px 24px -12px #5485E440", borderRadius: 6 }}>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: "#5485E4" }}>
                            Краткая статистика:
                        </Typography>
                        <TableContainer>
                            <Table sx={{ minWidth: 700 }}>
                                <TableHead>
                                    <TableRow>
                                        {ACTIONS.map(a => (
                                            <TableCell key={a.key}
                                                       sx={{ fontWeight: 700, fontSize: 16 }}>{a.label}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    <TableRow>
                                        {ACTIONS.map(a => (
                                            <TableCell key={a.key}
                                                       sx={{ fontWeight: 700, fontSize: 18, color: "#5485E4" }}>
                                                {stats[a.key].size}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                    {/* Таблица пользователей */}
                    <Paper sx={{ boxShadow: "0 4px 24px -12px #5485E440", borderRadius: 6, p: 2 }}>
                        <Typography variant="h6" sx={{ m: 3, fontWeight: 700, color: "#5485E4" }}>
                            Пользователи и их шаги:
                        </Typography>
                        <TableContainer>
                            <Table sx={{ minWidth: 900 }}>
                                <TableHead>
                                    <TableRow sx={{ background: "#E8F0FB" }}>
                                        <TableCell sx={{ fontWeight: 700 }}>ID пользователя</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Номер телефона</TableCell>
                                        {ACTIONS.map(a => (
                                            <TableCell key={a.key} sx={{
                                                fontWeight: 700,
                                                textAlign: "center"
                                            }}>{a.label}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {usersSteps.map(user => (
                                        <TableRow key={user.user_id}>
                                            <TableCell sx={{ fontWeight: 700 }}>{user.user_id}</TableCell>
                                            <TableCell>{user.phone_number || "нет номера"}</TableCell>
                                            {ACTIONS.map(a => (
                                                <TableCell key={a.key} align="center">
                                                    {user.actions.has(a.key) ? "✅" : ""}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </>
            )}
        </Box>
    );
}