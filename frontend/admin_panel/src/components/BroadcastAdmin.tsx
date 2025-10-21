import React, { useState } from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    CardMedia,
    FormControl,
    FormControlLabel,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Snackbar,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import DeleteIcon from "@mui/icons-material/Delete";
import LinkIcon from "@mui/icons-material/Link";
import SendIcon from "@mui/icons-material/Send";
import { api } from "./api"; // импорт axios helper

const BroadcastAdmin: React.FC = () => {
    const [message, setMessage] = useState("");
    const [mediaType, setMediaType] = useState<"none" | "photo" | "video">("none");
    const [mediaUrl, setMediaUrl] = useState("");
    const [userType, setUserType] = useState<"all" | "one">("all");
    const [userId, setUserId] = useState("");
    const [buttonTitle, setButtonTitle] = useState("");
    const [buttonUrl, setButtonUrl] = useState("");
    const [addButton, setAddButton] = useState(false);
    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean, text: string, type: "success" | "error" }>({
        open: false,
        text: "",
        type: "success"
    });

    const handleMediaTypeChange = (type: "none" | "photo" | "video") => {
        setMediaType(type);
        setMediaUrl("");
    };

    const handleSend = async () => {
        setLoading(true);
        try {
            const payload: any = {
                message,
                media_type: mediaType,
                media_url: mediaUrl,
            };
            if (userType === "one") {
                payload.user_id = userId;
            } else {
                payload.all_users = true;
            }
            if (addButton) {
                payload.button_title = buttonTitle;
                payload.button_url = buttonUrl;
            }
            await api.post("/api/broadcast", payload);
            setSnackbar({ open: true, text: "Рассылка отправлена!", type: "success" });
            setMessage("");
            setMediaUrl("");
            setMediaType("none");
            setUserId("");
            setButtonTitle("");
            setButtonUrl("");
            setAddButton(false);
        } catch (e: any) {
            setSnackbar({
                open: true,
                text: "Ошибка отправки: " + (e?.response?.data?.detail || "Проверьте подключение"),
                type: "error"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ width: "100%", maxWidth: 600, mx: "auto", mt: 2, mb: 8 }}>
            <Typography variant="h4" sx={{ color: "#5485E4", mb: 2, fontWeight: 700, fontFamily: "Nunito" }}>
                Рассылки от бота
            </Typography>
            <Typography sx={{ color: "#848391", mb: 3 }}>
                Отправьте сообщение одному пользователю или всем, прикрепите фото/видео, добавьте кнопку для
                мини-приложения. <a href="https://core.telegram.org/bots/api#html-style">Руководство HTML</a>
            </Typography>
            <FormControl component="fieldset" sx={{ mb: 2, minWidth: 220 }}>
                <InputLabel id="user-type-label">Кому отправить?</InputLabel>
                <Select
                    labelId="user-type-label"
                    value={userType}
                    label="Кому отправить?"
                    onChange={e => setUserType(e.target.value as "all" | "one")}
                >
                    <MenuItem value="all">Всем пользователям</MenuItem>
                    <MenuItem value="one">Один пользователь</MenuItem>
                </Select>
            </FormControl>
            {userType === "one" && (
                <TextField
                    label="TG ID пользователя"
                    value={userId}
                    onChange={e => setUserId(e.target.value)}
                    sx={{ mb: 2 }}
                    fullWidth
                />
            )}
            <TextField
                label="Текст сообщения (поддерживает HTML)"
                multiline
                minRows={3}
                value={message}
                onChange={e => setMessage(e.target.value)}
                fullWidth
                sx={{ mb: 2 }}
            />
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                <Tooltip title="Фото">
                    <IconButton color={mediaType === "photo" ? "primary" : "default"}
                                onClick={() => handleMediaTypeChange("photo")}>
                        <AddPhotoAlternateIcon/>
                    </IconButton>
                </Tooltip>
                <Tooltip title="Видео">
                    <IconButton color={mediaType === "video" ? "primary" : "default"}
                                onClick={() => handleMediaTypeChange("video")}>
                        <VideoLibraryIcon/>
                    </IconButton>
                </Tooltip>
                <Tooltip title="Без медиа">
                    <IconButton color={mediaType === "none" ? "primary" : "default"}
                                onClick={() => handleMediaTypeChange("none")}>
                        <DeleteIcon/>
                    </IconButton>
                </Tooltip>
            </Box>
            {(mediaType === "photo" || mediaType === "video") && (
                <TextField
                    label={mediaType === "photo" ? "URL фото" : "URL видео"}
                    value={mediaUrl}
                    onChange={e => setMediaUrl(e.target.value)}
                    fullWidth
                    sx={{ mb: 2 }}
                />
            )}
            {mediaUrl && mediaType === "photo" && (
                <Card sx={{ mb: 2 }}>
                    <CardMedia component="img" image={mediaUrl} alt="Фото" sx={{ maxHeight: 240 }}/>
                </Card>
            )}
            {mediaUrl && mediaType === "video" && (
                <Card sx={{ mb: 2 }}>
                    <CardMedia component="video" src={mediaUrl} controls sx={{ maxHeight: 240 }}/>
                </Card>
            )}
            <FormControlLabel
                control={
                    <Switch checked={addButton} onChange={e => setAddButton(e.target.checked)} color="primary"/>
                }
                label="Добавить кнопку для миниаппа"
                sx={{ mb: 2 }}
            />
            {addButton && (
                <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                    <TextField
                        label="Текст кнопки"
                        value={buttonTitle}
                        onChange={e => setButtonTitle(e.target.value)}
                        fullWidth
                        sx={{ flex: 1 }}
                    />
                    <TextField
                        label="URL миниаппа"
                        value={buttonUrl}
                        onChange={e => setButtonUrl(e.target.value)}
                        fullWidth
                        sx={{ flex: 2 }}
                        InputProps={{
                            startAdornment: (
                                <LinkIcon sx={{ color: "#5485E4", mr: 1 }}/>
                            ),
                        }}
                    />
                </Box>
            )}
            <Button
                variant="contained"
                color="primary"
                endIcon={<SendIcon/>}
                sx={{ mt: 3, borderRadius: 3, fontWeight: 700, fontFamily: "Nunito", height: 50, fontSize: 18 }}
                fullWidth
                disabled={loading || !message || (userType === "one" && !userId)}
                onClick={handleSend}
            >
                {userType === "all" ? "Отправить всем" : "Отправить"}
            </Button>
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar(s => ({ ...s, open: false }))}
            >
                <Alert severity={snackbar.type} sx={{ width: "100%" }}>
                    {snackbar.text}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default BroadcastAdmin;