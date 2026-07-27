"""Forms used to manage DayFlow users in Django Admin."""

from django import forms
from django.contrib.auth import password_validation
from django.contrib.auth.forms import ReadOnlyPasswordHashField

from .models import User


class UserAdminCreationForm(forms.ModelForm):
    password1 = forms.CharField(label="Contraseña", widget=forms.PasswordInput)
    password2 = forms.CharField(
        label="Confirmar contraseña",
        widget=forms.PasswordInput,
    )

    class Meta:
        model = User
        fields = (
            "username",
            "email",
            "first_name",
            "last_name",
            "position",
            "department",
            "role",
            "active",
            "must_change_password",
        )

    def clean_password2(self):
        password1 = self.cleaned_data.get("password1")
        password2 = self.cleaned_data.get("password2")
        if password1 and password2 and password1 != password2:
            raise forms.ValidationError("Las contraseñas no coinciden.")
        if password2:
            candidate_user = self.instance
            for field in ("username", "email", "first_name", "last_name"):
                if field in self.cleaned_data:
                    setattr(candidate_user, field, self.cleaned_data[field])
            password_validation.validate_password(password2, candidate_user)
        return password2

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password1"])
        if commit:
            user.save()
        return user


class UserAdminChangeForm(forms.ModelForm):
    password = ReadOnlyPasswordHashField(
        label="Contraseña",
        help_text=(
            "Las contraseñas no se almacenan en texto plano. "
            "Utiliza la acción de cambio de contraseña para reemplazarla."
        ),
    )

    class Meta:
        model = User
        fields = "__all__"

    def clean_password(self):
        return self.initial.get("password")
